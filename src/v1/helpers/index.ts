export function getFileName(path: string) {
  if (typeof path !== 'string' || path.length < 0) return path;
  const pathArray = path.split('/');

  if (pathArray.length > 1) {
    return pathArray.pop();
  }

  return path;
}
