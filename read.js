document.addEventListener('DOMContentLoaded', function() {
    const readingList = document.getElementById('reading-list');
    const loading = document.getElementById('loading');
    
    // Fetch the reading list data
    fetch('reading-list.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading indicator
            loading.style.display = 'none';
            
            // Create elements for each reading item
            data.forEach(item => {
                const li = document.createElement('li');
                li.className = 'reading-item';
                
                const link = document.createElement('a');
                link.href = item.url;
                link.className = 'reading-link';
                link.textContent = item.title;
                link.target = '_blank'; // Open in new tab
                
                const date = document.createElement('span');
                date.className = 'reading-date';
                date.textContent = item.date;
                
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                
                // Add description
                const description = document.createElement('div');
                description.textContent = item.description;
                tooltip.appendChild(description);
                
                // Add author
                const author = document.createElement('div');
                author.className = 'author';
                author.textContent = `by ${item.author}`;
                tooltip.appendChild(author);
                
                // Add mouseover and mouseout events for tooltip positioning
                link.addEventListener('mousemove', (e) => {
                    tooltip.style.left = (e.pageX + 10) + 'px';
                    tooltip.style.top = (e.pageY + 10) + 'px';
                });
                
                li.appendChild(link);
                li.appendChild(tooltip);
                li.appendChild(date);
                readingList.appendChild(li);
            });
        })
        .catch(error => {
            console.error('Error fetching reading list:', error);
            loading.textContent = 'Failed to load reading list. Please try again later.';
            loading.style.color = '#BF616A';
        });
});