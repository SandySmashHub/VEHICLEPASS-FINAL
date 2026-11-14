import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

/** Subscribes to a Socket.IO event for the lifetime of the component. */
export default function useSocketEvent(event, handler) {
  const { socket } = useAuth();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!socket) return undefined;
    const fn = (...args) => ref.current(...args);
    socket.on(event, fn);
    return () => socket.off(event, fn);
  }, [socket, event]);
}
