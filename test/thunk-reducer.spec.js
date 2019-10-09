/* eslint-env jest */

import { act, renderHook } from 'react-hooks-testing-library';
import { cleanup } from '@testing-library/react';

import useThunkReducer from '..';

function init(initialCount) {
  return {
    count: initialCount,
  };
}

function reducer(state, { type }) {
  switch (type) {
    case 'increment':
      return { count: state.count + 1 };
    default:
      throw new Error();
  }
}

function increment() {
  return {
    type: 'increment',
  };
}

describe('thunk reducer hook tests', () => {
  afterEach(cleanup);

  test('returns state and dispatcher', () => {
    const { result } = renderHook(() => useThunkReducer(reducer, { count: 0 }));

    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toEqual({ count: 0 });
    expect(result.current[1]).toBeInstanceOf(Function);
  });

  test('initializes state lazily', () => {
    const { result } = renderHook(() => useThunkReducer(reducer, 0, init));

    expect(result.current[0]).toEqual({ count: 0 });
  });

  test('dispatches an action', () => {
    const { result } = renderHook(() => useThunkReducer(reducer, 0, init));
    const [, dispatch] = result.current;

    expect(result.current[0].count).toEqual(0);
    act(() => dispatch(increment()));
    expect(result.current[0].count).toEqual(1);
  });

  test('dispatches a thunk', () => {
    function incrementThunk() {
      return (dispatch, getState) => {
        const stateA = getState();
        expect(stateA.count).toEqual(0);

        act(() => dispatch(increment()));

        const stateB = getState();
        expect(stateA.count).toEqual(0);
        expect(stateB.count).toEqual(1);
      };
    }

    const { result } = renderHook(() => useThunkReducer(reducer, 0, init));
    const [, dispatch] = result.current;

    expect(result.current[0].count).toEqual(0);
    act(() => dispatch(incrementThunk()));
    expect(result.current[0].count).toEqual(1);
  });

  test('dispatches nested thunks', () => {
    function incrementThunkInner() {
      return (dispatch) => {
        act(() => dispatch(increment()));
      };
    }

    function incrementThunk() {
      return (dispatch) => {
        act(() => dispatch(incrementThunkInner()));
      };
    }

    const { result } = renderHook(() => useThunkReducer(reducer, 0, init));
    const [, dispatch] = result.current;

    expect(result.current[0].count).toEqual(0);
    act(() => dispatch(incrementThunk()));
    expect(result.current[0].count).toEqual(1);
  });

  test('dispatches an asynchronous thunk', (done) => {
    function incrementThunkAsync() {
      return (dispatch, getState) => {
        const stateA = getState();
        expect(stateA.count).toEqual(0);

        setTimeout(() => {
          const stateB = getState();
          expect(stateA.count).toEqual(0);
          expect(stateB.count).toEqual(1);

          act(() => dispatch(increment()));

          const stateC = getState();
          expect(stateA.count).toEqual(0);
          expect(stateB.count).toEqual(1);
          expect(stateC.count).toEqual(2);
          done();
        }, 100);
      };
    }

    const { result } = renderHook(() => useThunkReducer(reducer, 0, init));
    const [, dispatch] = result.current;

    expect(result.current[0].count).toEqual(0);
    act(() => dispatch(incrementThunkAsync()));
    act(() => dispatch(increment()));
    expect(result.current[0].count).toEqual(1);
  });

  test('dispatch returns value of thunk', () => {
    function incrementAndReturnCount() {
      return (dispatch, getState) => {
        expect(getState().count).toEqual(0);
        act(() => dispatch(increment()));
        expect(getState().count).toEqual(1);
        return getState().count;
      };
    }

    const { result } = renderHook(() => useThunkReducer(reducer, 0, init));
    const [, dispatch] = result.current;

    act(() => {
      expect(dispatch(incrementAndReturnCount())).toEqual(1);
    });
  });

  test('hook result does not change if its inputs are changed', () => {
    const renderHookResult = renderHook(() => useThunkReducer(reducer, { count: 0 }));

    // Capture the state and dispatch after first render
    const [state, dispatch] = renderHookResult.result.current;

    // Ensure that the hook state is updated, then rerender the hook
    renderHookResult
      .waitForNextUpdate()
      .then(() => {
        renderHookResult.rerender();
      })
      .then(() => {
        // Capture the new state and dispatch returned after the hook is
        // rerendered. This should not change if the hook props are not changed
        const [newState, newDispatch] = renderHookResult.result.current;

        expect(newState).toBe(state);
        expect(newDispatch).toBe(dispatch);
      });
  });

  test('hook result changes if inputs change', () => {
    function newReducer(state, { type }) {
      switch (type) {
        case 'decrement':
          return { count: state.count - 1 };
        default:
          throw new Error();
      }
    }

    const renderHookResult = renderHook(
      ({ reducerProp }) => useThunkReducer(reducerProp, { count: 0 }),
      { initialProps: { reducerProp: reducer } },
    );

    // Capture the state and dispatch after first render
    const [state, dispatch] = renderHookResult.result.current;

    // Ensure that the hook state is updated, then rerender the hook
    renderHookResult
      .waitForNextUpdate()
      .then(() => {
        renderHookResult.rerender({ reducerProp: newReducer });
      })
      .then(() => {
        // Capture the new state and dispatch returned after the hook is
        // rerendered. Because the hook reducer is changed, the returned
        // dispatch function must also be changed
        const [newState, newDispatch] = renderHookResult.result.current;

        expect(newState).toBe(state);
        expect(newDispatch).not.toBe(dispatch);
      });
  });
});
