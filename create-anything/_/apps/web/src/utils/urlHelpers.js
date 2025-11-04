export function getAbsoluteUrl(relativePath) {
  if (!relativePath) return null;
  
  // Already an absolute URL
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // Already has /api prefix
  if (relativePath.startsWith('/api/')) {
    return relativePath;
  }
  
  // Add /api prefix for object storage paths and other relative paths
  return `/api${relativePath}`;
}
