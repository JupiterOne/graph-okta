export default function getTime(time: Date | string): number {
  return new Date(time).getTime();
}
