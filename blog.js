document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded');
  
  // Check which page we're on
  const postsListElement = document.getElementById('posts-list');
  const latestPostsElement = document.getElementById('latest-posts');
  const postContentElement = document.getElementById('post-content');
  
  // Function to format posts in the compact style
  function formatPosts(posts, container, limit = null) {
    // If limit is provided, only show that many posts
    const postsToShow = limit ? posts.slice(0, limit) : posts;
    
    let html = '';
    postsToShow.forEach(post => {
      // Create tags string
      const tagsHtml = post.tags.map(tag => 
        `<a href="#" class="post-tag">${tag}</a>`
      ).join(', ');
      
      // Create compact post display
      html += `
        <div class="post-item">
          <a href="post.html?post=${post.slug}" class="post-title">${post.title}</a>
          <div class="post-meta">
            ${post.date} | ${tagsHtml}
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }
  
  // Function to load single post content
  async function loadPostContent() {
    try {
      // Get the post slug from URL
      const urlParams = new URLSearchParams(window.location.search);
      const postSlug = urlParams.get('post');
      
      if (!postSlug) {
        postContentElement.innerHTML = '<div class="error-message">No post specified</div>';
        return;
      }
      
      console.log('Loading post content for:', postSlug);
      
      // Load the markdown file
      const response = await fetch(`./posts/${postSlug}.md`);
      if (!response.ok) {
        throw new Error(`Post not found: ${response.status}`);
      }
      
      const markdown = await response.text();
      
      // Parse frontmatter and content
      const { frontmatter, content } = parseFrontmatter(markdown);
      
      // Set post title
      document.title = `${frontmatter.title}`;
      document.getElementById('post-title').textContent = frontmatter.title || '';
      
      // Set post date
      if (frontmatter.date) {
        document.getElementById('post-date').textContent = frontmatter.date;
      }
      
      // Render post content using marked.js
      const htmlContent = marked.parse(content);
      postContentElement.innerHTML = htmlContent;
      
      // Add tags if they exist
      if (frontmatter.tags && Array.isArray(frontmatter.tags) && frontmatter.tags.length > 0) {
        const tagsContainer = document.getElementById('post-tags');
        frontmatter.tags.forEach(tag => {
          const tagSpan = document.createElement('span');
          tagSpan.className = 'tag';
          tagSpan.textContent = tag;
          tagsContainer.appendChild(tagSpan);
        });
      }
      
      // Apply syntax highlighting
      document.querySelectorAll('pre code').forEach((block) => {
        if (block.className.indexOf('language-math') === -1 && 
            block.className.indexOf('language-tex') === -1) {
          hljs.highlightElement(block);
        }
      });
      
      // Render LaTeX if available
      if (window.MathJax) {
        if (typeof MathJax.typeset === 'function') {
          MathJax.typeset();
        } else if (MathJax.Hub && typeof MathJax.Hub.Typeset === 'function') {
          MathJax.Hub.Typeset();
        }
      }
    } catch (error) {
      console.error('Error loading post:', error);
      postContentElement.innerHTML = `<div class="error-message">Error loading post: ${error.message}</div>`;
    }
  }
  
  // Helper function to parse frontmatter
  function parseFrontmatter(markdown) {
    const frontmatterRegex = /^---\s*([\s\S]*?)\s*---/;
    const match = frontmatterRegex.exec(markdown);
    
    if (!match) {
      return { 
        frontmatter: {}, 
        content: markdown 
      };
    }
    
    const frontmatterStr = match[1];
    const content = markdown.slice(match[0].length).trim();
    const frontmatter = {};
    
    // Parse the YAML frontmatter
    frontmatterStr.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();
        
        // Handle quoted strings
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        
        // Handle arrays (tags: [item1, item2])
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1).split(',').map(item => {
            item = item.trim();
            return item.startsWith('"') && item.endsWith('"') ? item.slice(1, -1) : item;
          });
        }
        
        frontmatter[key] = value;
      }
    });
    
    return { frontmatter, content };
  }
  
  // Fetch posts listing
  if (postsListElement || latestPostsElement) {
    fetch('./posts/index.json')
      .then(response => response.json())
      .then(data => {
        console.log('Posts loaded:', data.length);
        
        // If we're on the writings page
        if (postsListElement) {
          formatPosts(data, postsListElement);
        }
        
        // If we're on the home page
        if (latestPostsElement) {
          formatPosts(data, latestPostsElement, 3);
        }
      })
      .catch(error => {
        console.error('Error loading posts:', error);
        
        // Show error message in relevant container
        const container = postsListElement || latestPostsElement;
        if (container) {
          container.innerHTML = '<div class="error-message">Error loading posts</div>';
        }
      });
  }
  
  // If we're on the post page, load the post content
  if (postContentElement) {
    loadPostContent();
  }
});

// Configure marked to handle LaTeX
function configureMarked() {
  // Save the original renderer
  const renderer = new marked.Renderer();
  
  // Override how code blocks are rendered
  const originalCode = renderer.code;
  renderer.code = function(code, language) {
    // If it's a math block (use ```math for LaTeX blocks)
    if (language === 'math' || language === 'tex') {
      return `<div class="math-block">\\[${code}\\]</div>`;
    }
    // Otherwise use the original renderer
    return originalCode.call(this, code, language);
  };
  
  // Override how paragraphs are rendered to handle inline math
  const originalParagraph = renderer.paragraph;
  renderer.paragraph = function(text) {
    // Process inline math delimited by $ ... $
    text = text.replace(/\$([^\$]+)\$/g, '\\($1\\)');
    return originalParagraph.call(this, text);
  };
  
  // Set the custom renderer
  marked.setOptions({ renderer: renderer });
}

// Function to load and render a single post
async function loadSinglePost() {
  // Get the post filename from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const postFile = urlParams.get('post');
  
  if (!postFile) {
    document.getElementById('post-content').innerHTML = '<p>Post not found</p>';
    return;
  }

  try {
    // Load the markdown file with cache busting
    const response = await fetch(`./posts/${postFile}.md?t=${new Date().getTime()}`);
    if (!response.ok) {
      throw new Error(`Post not found: ${response.status} ${response.statusText}`);
    }
    
    const markdown = await response.text();
    
    // Parse frontmatter and content
    const { frontmatter, content } = parseFrontmatter(markdown);
    
    // Set post title
    document.title = `${frontmatter.title}`;
    document.getElementById('post-title').textContent = frontmatter.title || '';
    
    // Set post date
    if (frontmatter.date) {
      const date = new Date(frontmatter.date);
      const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).toUpperCase();
      document.getElementById('post-date').textContent = formattedDate;
    }
    
    // Render post content
    const htmlContent = marked.parse(content);
    document.getElementById('post-content').innerHTML = htmlContent;
    
    // Add tags if they exist
    if (frontmatter.tags && Array.isArray(frontmatter.tags) && frontmatter.tags.length > 0) {
      const tagsContainer = document.getElementById('post-tags');
      frontmatter.tags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        tagSpan.textContent = tag;
        tagsContainer.appendChild(tagSpan);
      });
    }
    
    // Apply syntax highlighting to code blocks
    document.querySelectorAll('pre code').forEach((block) => {
      // Don't apply syntax highlighting to math blocks
      if (block.className.indexOf('language-math') === -1 && 
          block.className.indexOf('language-tex') === -1) {
        hljs.highlightElement(block);
      }
    });
    
    // Render LaTeX formulas
    if (window.MathJax) {
      if (typeof MathJax.typeset === 'function') {
        MathJax.typeset();
      } else if (MathJax.Hub && typeof MathJax.Hub.Typeset === 'function') {
        MathJax.Hub.Typeset();
      }
    }
  } catch (error) {
    console.error('Error loading post:', error);
    document.getElementById('post-content').innerHTML = `<p>Error loading post: ${error.message}</p>
    <p>Make sure you have:</p>
    <ol>
      <li>Created the <code>posts</code> directory in your root folder</li>
      <li>Added the markdown file with the correct name (<code>${postFile}.md</code>)</li>
      <li>Properly uploaded all files to your server</li>
    </ol>`;
  }
}

// Function to load all posts for the index page
async function loadAllPosts() {
  try {
    // Load the posts index with cache busting
    const response = await fetch('./posts/index.json?t=' + new Date().getTime());
    if (!response.ok) {
      throw new Error(`Could not load posts index: ${response.status} ${response.statusText}`);
    }
    
    const posts = await response.json();
    const postsList = document.getElementById('posts-list');
    
    // Sort posts by date (newest first)
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Clear existing posts
    postsList.innerHTML = '';
    
    // Add each post to the list
    posts.forEach(post => {
      const postDate = new Date(post.date);
      const formattedDate = postDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).toUpperCase();
      
      const postElement = document.createElement('li');
      postElement.className = 'blog-item';
      
      // Create post HTML
      let postHTML = `
        <span class="blog-date">${formattedDate}</span>
        <a href="post.html?post=${post.slug}" class="blog-title">${post.title}</a>
        <p class="blog-desc">${post.description || ''}</p>
        <a href="post.html?post=${post.slug}" class="read-more">Read more →</a>
        <div class="tags">
      `;
      
      // Add tags
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          postHTML += `<span class="tag">${tag}</span>`;
        });
      }
      
      postHTML += '</div>';
      
      postElement.innerHTML = postHTML;
      postsList.appendChild(postElement);
    });
  } catch (error) {
    console.error('Error loading posts:', error);
    document.getElementById('posts-list').innerHTML = '<p>Error loading posts</p>';
  }
}

// Helper function to parse frontmatter from markdown
function parseFrontmatter(markdown) {
  const frontmatterRegex = /^---\s*([\s\S]*?)\s*---/;
  const match = frontmatterRegex.exec(markdown);
  
  if (!match) {
    return { 
      frontmatter: {}, 
      content: markdown 
    };
  }
  
  const frontmatterStr = match[1];
  const content = markdown.slice(match[0].length).trim();
  const frontmatter = {};
  
  // Parse the YAML frontmatter
  frontmatterStr.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      
      // Handle quoted strings
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      
      // Handle arrays (tags: [item1, item2])
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(item => {
          item = item.trim();
          return item.startsWith('"') && item.endsWith('"') ? item.slice(1, -1) : item;
        });
      }
      
      frontmatter[key] = value;
    }
  });
  
  return { frontmatter, content };
}

/// Simplified function to load latest posts - only show title, date and tags
async function loadLatestPosts(containerId, limit = 3) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Container element not found:', containerId);
    return;
  }
  
  try {
    console.log('Attempting to load posts index...');
    const response = await fetch('./posts/index.json');
    
    if (!response.ok) {
      throw new Error(`Could not load posts index: ${response.status}`);
    }
    
    const posts = await response.json();
    console.log('Posts loaded:', posts);
    
    // Clear loading indicator
    container.innerHTML = '';
    
    // No posts available
    if (posts.length === 0) {
      container.innerHTML = '<p class="no-posts">No posts available yet.</p>';
      return;
    }
    
    // Take only the most recent posts (up to the limit)
    const latestPosts = posts.slice(0, Math.min(posts.length, limit));
    
    // Create HTML for each post
    latestPosts.forEach(post => {
      const postElement = document.createElement('li');
      postElement.className = 'blog-item';
      
      // Create post HTML - only title, date and tags
      let postHTML = `
        <span class="blog-date">${post.date}</span>
        <a href="post.html?post=${post.slug}" class="blog-title">${post.title}</a>
        <div class="tags">
      `;
      
      // Add tags
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          postHTML += `<span class="tag">${tag}</span>`;
        });
      }
      
      postHTML += '</div>';
      
      postElement.innerHTML = postHTML;
      container.appendChild(postElement);
    });
  } catch (error) {
    console.error('Error loading latest posts:', error);
    container.innerHTML = '<p>Error loading latest posts. Check console for details.</p>';
  }
}