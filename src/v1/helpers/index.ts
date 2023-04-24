export function getFileName(path: string) {
  if (typeof path !== 'string' || path.length < 0) return path;
  const pathArray = path.split('/');

  if (pathArray.length > 1) {
    return pathArray.pop();
  }

  return path;
}

export function getQueryStrings(url: string) {
  if (typeof url !== 'string' || url.length < 0) return url;
  const urlArray = url.split('?');

  if (urlArray.length < 2) return {};

  const queryStrings = urlArray[1].split('&');

  const queryObject = queryStrings.reduce((acc: any, query) => {
    const [key, value] = query.split('=');

    acc[key] = getConvertValueType(value);
    return acc;
  }, {});

  return queryObject;
}

export function getConvertValueType(value: string) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (value === 'undefined') return undefined;
  if (value === 'NaN') return NaN;
  if (!isNaN(+value)) return +value;
  return value;
}
