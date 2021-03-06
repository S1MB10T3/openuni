import { combineReducers } from 'redux';

import selfReducer from './self';
import streamReducer from './stream';
import streamsReducer from './streams';
import uiReducer from './ui';
import loadingReducer from './loading';
import notesReducer from './notes';
import noteReducer from './note';
import basicStreamsReducer from './basic-streams'


export default combineReducers({
  isLoading: loadingReducer,
  stream: streamReducer,
  streams: streamsReducer,
  ui: uiReducer,
  self: selfReducer,
  notes: notesReducer,
  note:noteReducer,
  basicStreams:basicStreamsReducer,
});
