async function fetchLinkPreview(url: string) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Create a basic parser
    const getTag = (tag: string) => {
      const match = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}`));
      return match ? match[1] : '';
    };
    
    const getMeta = (name: string) => {
      const match = html.match(new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']`));
      return match ? match[1] : '';
    };

    // Get OpenGraph or fallback data
    return {
      title: getMeta('og:title') || getTag('title'),
      description: getMeta('og:description') || getMeta('description'),
      image: getMeta('og:image'),
      url: url
    };
  } catch (error) {
    console.error('Error fetching preview:', error);
    return null;
  }
}

export { fetchLinkPreview };
