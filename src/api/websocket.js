/* global process */
import cluster from 'cluster';
import WebSocket from 'uws';
import uuid from 'uuid/v4';
import hash from 'string-hash';
import { URL } from 'url';

import { Rustler, Stream, BannedStream, User } from '../db';
const isValidAdvancedUrl = require('../util/is-valid-advanced-url')(URL);


const debug = require('debug')('overrustle:websocket');

// Services whose channel names are case insensitive. Channel names on these
// services are lowercased in the database in order to prevent duplicates from
// arising due to differences in casing. For example, if one user is watching
// "twitch/Destiny", and another is watching "twitch/destiny", we track this as
// being two users watching "twitch/destiny", since they are both actually
// watching the same stream on this particular service. An example of a
// case-sensitive service would be YouTube.
const CASE_INSENSITIVE_SERVICES = [
  'angelthump',
  'hitbox',
  'twitch',
  'ustream',
];


export default function makeWebSocketServer(server) {

  const wss = new WebSocket.Server({ server });
  const rustler_sockets = new Map(); // Rustler.id => websocket map

  // update all rustlers for this stream, and the lobby
  let updateRustlers = async stream_id => {
    // ensure we're actually updating a stream and not the lobby on accident
    if (!stream_id) {
      return;
    }
    const [ rustlers, rustler_count, stream ] = await Promise.all([ // we can do this in parallel
      // send this update to everyone on this stream and everyone in the lobby
      Rustler.findAll({
        where: {
          $or: [
            { stream_id },
            { stream_id: null },
          ],
        },
      }),
      // need to get the amount of rustlers watching this stream too
      Stream.findRustlersFor(stream_id),
      Stream.findById(stream_id),
    ]);

    // send update to these rustlers
    debug(`updating the ${rustler_count} rustlers on stream ${stream.service}/${stream.channel} (${stream_id})`);
    for (const rustler of rustlers) {
      const ws = rustler_sockets.get(rustler.id);
      // check that we have this rustler, they might be using another websocket server
      if (ws) {
        ws.send(JSON.stringify(['RUSTLERS_SET', stream_id, rustler_count]));
      }
    }

    // get rid of the stream if no one's watching it anymore
    if (rustler_count === 0) {
      await Stream.destroy({ where: { id: stream_id } });
    }
  };
  const updateLobby = async () => {
    // get all streams and count rustlers
    const streams = await Stream.findAllWithRustlers();
    // send `STREAMS_SET`
    for (const ws of rustler_sockets.values()) {
      ws.send(JSON.stringify([
        'STREAMS_SET',
        streams,
      ]));
    }
  };
  // need to set up some relaying if we're multi-processing
  // set up basic eventing between master and slave
  if (cluster.isWorker) {
    // define events to listen to from master
    const events = {
      updateRustlers,
      updateLobby,
    };
    // listen for events from master
    process.on('message', message => {
      debug('got message from master %j', message);
      if (message.event) {
        const { event, args } = message;
        const handler = events[event];
        if (handler) {
          debug(`handling event from master "${event}"`);
          handler(...(args || []));
        }
      }
    });
    // make our `updateRustlers` function notify master instead
    updateRustlers = (...args) => process.send({
      type: 'forward',
      payload: {
        event: 'updateRustlers',
        args: args,
      },
    });
  }

  const wsEventHandlers = {
    // get information about a stream
    // getStream('fee55b7e-fac7-46b8-a5dd-4e86b106e846');
    async getStream(id, stream_id) {
      const ws = rustler_sockets.get(id);
      try {
        const stream = await Stream.findById(stream_id);
        if (!stream) {
          throw new Error(`Stream "${stream_id}" not found`);
        }
        const rustlers = await Stream.findRustlersFor(stream.id);
        // send `SET_STREAM` acknowledgement
        ws.send(JSON.stringify(['STREAM_GET', {
          ...stream.toJSON(),
          rustlers,
        }]));
      }
      catch (err) {
        debug(`Failed to respond to \`getStream\` event from rustler ${id}`, err);
        ws.send(JSON.stringify([
          'ERR',
          err.message,
        ]));
      }
    },

    // set the user's stream to [channel, service], or id, or null (for lobby)
    // eg, on client:
    // setStream('destiny', 'twitch');
    // setStream('destiny'); // where `destiny` is the name of the overrustle user
    // setStream(null); // lobby
    async setStream(id, channel, service) {
      const ws = rustler_sockets.get(id);
      try {
        // Basic channel name sanitization.
        if ((service === 'advanced' && !isValidAdvancedUrl(channel))
          || (service !== 'advanced' && !/^[a-zA-Z0-9\-_]{1,64}$/.test(channel))) {
          debug(`rejecting ${service}/${channel} as invalid`);
          channel = null;
        }

        if (service === 'advanced') {
          channel = new URL(channel).href;
        }

        // get our rustler and their stream from the db
        const [ rustler ] = await Rustler.findAll({
          where: { id },
          limit: 1,
          include: [
            {
              model: Stream,
              as: 'stream',
            },
          ],
        });
        // get our stream
        let stream;
        let bannedStream;
        if (!channel) {
          // we must be setting our stream to null (for lobby)
          stream = null;
        }
        else {
          if (!service) {
            // must be setting by overrustle user
            ([ stream ] = await Stream.findAll({
              where: { overrustle_id: channel },
              include: [
                {
                  model: User,
                  as: 'overrustle',
                },
              ],
              limit: 1,
            }));
            if (!stream) {
              const user = await User.findById(channel);
              // ensure that `channel` is a real overrustle user
              if (!user) {
                throw new Error(`User "${channel}" does not exist`);
              }
              // ensure that the user has a channel
              if (!user.channel || !user.service) {
                throw new Error(`User "${channel}" does not have a channel`);
              }
              stream = await Stream.create({
                id: hash(`${user.service}/${user.channel}`),
                channel: user.channel,
                service: user.service,
                overrustle_id: channel,
              });
            }
          }
          else {
            if (CASE_INSENSITIVE_SERVICES.includes(service)) {
              channel = channel.toLowerCase();
            }

            // must be setting by channel-service pair
            ([ stream ] = await Stream.findAll({
              where: { channel, service },
              limit: 1,
            }));
            if (!stream) {
              stream = await Stream.create({
                id: hash(`${service}/${channel}`),
                channel,
                service,
              });
            }
          }
        }
        const prevStream = rustler.stream ? rustler.stream.toJSON() : null;
        let banned = false;
        if (stream) {
          ([ bannedStream ] = await BannedStream.findAll({
            where: { channel: stream.channel, service: stream.service },
            limit: 1,
          }));
          if (bannedStream) {
            banned = true;
          }
        }
        if (stream && !banned) {
          debug('rustler set stream %j => %j', prevStream, stream.toJSON());
          // update rustler
          await rustler.update({ stream_id: stream.id });
          const rustlers = await Stream.findRustlersFor(stream.id);
          // send `SET_STREAM` acknowledgement
          ws.send(JSON.stringify(['STREAM_SET', {
            ...stream.toJSON(),
            rustlers,
          }]));
          // update everyone else
          await updateRustlers(stream.id);
        }
        else {
          debug('rustler set stream %j => null', prevStream);
          // update rustler
          await rustler.update({ stream_id: null });
          if (banned) {
            await stream.destroy();
            ws.send(JSON.stringify([
              'STREAM_BANNED',
              null,
            ]));
          }
          // get all streams and count rustlers
          const streams = await Stream.findAllWithRustlers();
          // send `SET_STREAM` acknowledgement
          ws.send(JSON.stringify([
            'STREAM_SET',
            null,
          ]));
          // send `STREAMS_SET` now (because they're in the lobby)
          ws.send(JSON.stringify([
            'STREAMS_SET',
            streams,
          ]));
        }
        // update everyone else
        if (prevStream) {
          await updateRustlers(prevStream.id);
        }
      }
      catch (err) {
        debug(`Failed to respond to \`setStream\` event from rustler ${id}`, err);
        ws.send(JSON.stringify([
          'ERR',
          err.message,
        ]));
      }
    },
    async disconnect(id) {
      try {
        rustler_sockets.delete(id);
        const rustler = await Rustler.findById(id);

        // This rustler is not in the database, so nothing needs to be done here.
        if (!rustler) {
          debug('no known rustler with id', id);
          return;
        }

        debug('rustler disconnect %j', rustler.toJSON());
        const { stream_id } = rustler;
        await rustler.destroy();
        if (stream_id) {
          await updateRustlers(stream_id);
        }
      }
      catch (err) {
        debug('Error disconnecting', err);
      }
    },
  };

  wss.on('connection', ws => {
    try {
      const id = uuid();
      rustler_sockets.set(id, ws);
      const rustler_create = Rustler.create({ id, stream_id: null });
      ws.on('message', async message => {
        // handle client 'ping', which is an empty string
        if (!message) {
          return;
        }
        try {
          const [ event, ...args ] = JSON.parse(message);
          const handler = wsEventHandlers[event];
          if (!handler) {
            throw new TypeError(`Invalid event "${event}"`);
          }
          // ensure we've created this rustler first
          await Promise.resolve(rustler_create);
          debug(`event [${event}] (${id})`);
          handler(id, ...args);
        }
        catch (err) {
          debug(`Failed to handle incoming websocket message:\n${message}\n`, err);
          ws.send(JSON.stringify([
            'ERR',
            err.message,
          ]));
        }
      });
      ws.on('close', async () => {
        // ensure we've created this rustler first
        await Promise.resolve(rustler_create);
        wsEventHandlers.disconnect(id);
      });
    }
    catch (err) {
      debug('Failed to handle incoming websocket connection', err);
    }
  });
}
