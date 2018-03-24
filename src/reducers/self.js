import INITIAL_STATE from '../INITIAL_STATE';
import {
  LOGIN,
  LOGOUT,
  SET_PROFILE,
  PROFILE_FETCH_START,
  PROFILE_FETCH_FAILURE,
  PROFILE_UPDATE_FAILURE,
} from '../actions';


function selfReducer(state = INITIAL_STATE.self, action) {
  switch (action.type) {
    case SET_PROFILE:
      return {
        ...state,
        profile: {
          err: null,
          isFetching: false,
          data: action.payload,
        },
      };
    case PROFILE_FETCH_START:
      return {
        ...state,
        profile: {
          ...state.profile,
          isFetching: true,
        },
      };
    case PROFILE_FETCH_FAILURE:
    case PROFILE_UPDATE_FAILURE:
      return {
        ...state,
        profile: {
          ...state.profile,
          isFetching: false,
          err: action.error,
        },
      };
    case LOGIN:
      return {
        ...state,
        isLoggedIn: action.payload,
      };
    case LOGOUT:
      return {
        ...state,
        profile: INITIAL_STATE.self.profile,
        isLoggedIn: false,
      };
  }
  return state;
}

export default selfReducer;
