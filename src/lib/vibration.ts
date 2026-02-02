export function vibrateShort(): void {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([200, 50, 200]); //vibrate 200ms, pause 50ms, vibrate 200ms,
      console.log ('vibrating....')
    } catch (error) {
      console.debug('Vibration failed:', error);
    }
  }
}
