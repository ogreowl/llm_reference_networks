const width = 1000;
const height = 600;
const margin = { top: 40, right: 40, bottom: 60, left: 80 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;


const datasets = [
    { value: 'philosophers', text: 'Philosophers' },
    { value: 'general', text: 'General' },
    { value: 'scientists', text: 'Scientists' }
];

// Update the dataset URLs
const datasetUrls = {
    philosophers: {
        matrix: 'https://raw.githubusercontent.com/ogreowl/llm_reference_networks/main/data/gpt3_philosophers.csv',
        list: 'https://raw.githubusercontent.com/ogreowl/llm_reference_networks/main/data/philosopherList.csv'
    },
    general: {
        matrix: 'https://raw.githubusercontent.com/ogreowl/llm_reference_networks/main/data/gpt3_general.csv',
        list: 'https://raw.githubusercontent.com/ogreowl/llm_reference_networks/main/data/generalList.csv'
    },
    scientists: {
        matrix: 'https://raw.githubusercontent.com/ogreowl/llm_reference_networks/main/data/gpt3_scientists.csv',
        list: 'https://raw.githubusercontent.com/ogreowl/llm_reference_networks/main/data/scientistList.csv'
    }
};

let currentDataset = 'philosophers'; 

function applyDarkMode(isDarkMode) {
    const backgroundColor = isDarkMode ? '#1a1a1a' : 'white';
    const textColor = isDarkMode ? 'white' : 'black';
    const gridColor = isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
    
    d3.select('body')
        .style('background-color', backgroundColor)
        .style('color', textColor);
    
    d3.select('svg')
        .style('background-color', backgroundColor);
    
    d3.select('.controls')
        .style('background', backgroundColor)
        .style('border', `1px solid ${isDarkMode ? '#444' : '#ccc'}`)
        .style('color', textColor);
    
    // Update axes and labels
    d3.selectAll('.x-axis, .y-axis')
        .style('color', textColor)
        .selectAll('path, line')
        .style('stroke', textColor);
    
    d3.selectAll('.x-axis text, .y-axis text')
        .style('fill', textColor);
    
    // Update grid lines
    d3.selectAll('.grid')
        .style('color', gridColor);
    
    // Update points and labels
    d3.selectAll('.point-group circle:first-child')
        .style('fill', isDarkMode ? '#6ca0dc' : 'steelblue');
    
    d3.selectAll('.point-group circle:last-child')
        .style('fill', isDarkMode ? '#6ca0dc' : 'steelblue');
    
    d3.selectAll('.label')
        .style('fill', textColor);
    
    d3.selectAll('.link')
        .style('stroke', isDarkMode ? '#6ca0dc' : 'steelblue');
    
    d3.select('#arrowhead path')
        .attr('fill', isDarkMode ? '#6ca0dc' : 'steelblue');
    
    // Update axis titles
    d3.selectAll('text')
        .filter(function() {
            return this.textContent === 'Birth Year' || 
                   this.textContent === 'Total Outgoing References';
        })
        .style('fill', textColor);

    // Update dataset bubbles
    d3.selectAll('.dataset-bubble')
        .style('border-color', textColor)
        .style('background-color', function(d) {
            const isSelected = d.value === currentDataset;
            return isSelected ? 'steelblue' : backgroundColor;
        })
        .style('color', function(d) {
            const isSelected = d.value === currentDataset;
            return isSelected ? 'white' : textColor;
        });

    // Update focal points
    d3.selectAll('.point-group')
        .each(function(d) {
            const isFocal = selectedPhilosopher && d.name === selectedPhilosopher.name;
            d3.select(this).selectAll('circle')
                .style('fill', isFocal ? '#8A2BE2' : (isDarkMode ? '#6ca0dc' : 'steelblue'))
                .style('opacity', function() {
                    const isLargeCircle = d3.select(this).attr('r') > 4;
                    return isLargeCircle ? 0.2 : 1;
                });
        });
}

function toggleDarkMode() {
    const isDarkMode = d3.select('#darkModeToggle').property('checked');
    applyDarkMode(isDarkMode);
}

function loadVisualization(matrixData, authorsData) {
    d3.selectAll('svg').remove();
    d3.select('.controls').remove();
    
    function normalizeName(name) {
        return name.normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[^a-zA-Z\s,\.]/g, '');
    }

    const normalizedColumns = matrixData.columns.map((col, i) => 
        i === 0 ? col : normalizeName(col)
    );
    matrixData.columns = normalizedColumns;

    matrixData.forEach(row => {
        const originalName = row[''];
        if (originalName) {
            row[''] = normalizeName(originalName);
        }
    });

    authorsData.forEach(author => {
        author.Author = normalizeName(author.Author);
    });

    console.log('Matrix Data:', matrixData);
    console.log('Authors Data:', authorsData);

    const philosopherNames = new Set([
        ...Object.keys(matrixData[0]).filter(key => key !== ''),  // Column names
        ...matrixData.map(row => row[''])  // Row names
    ]);
    console.log('All Philosopher Names:', Array.from(philosopherNames));

    const philosophers = Array.from(philosopherNames).map(name => {
        const authorInfo = authorsData.find(author => author.Author === name);
        console.log(`Looking for ${name}:`, authorInfo);
        
        let birthYear = null;
        if (authorInfo) {
            birthYear = authorInfo['Birth Year'] ? 
                parseFloat(authorInfo['Birth Year']) : 
                (authorInfo['Death Year'] ? parseFloat(authorInfo['Death Year']) - 50 : null);
        }
        
        return {
            name: name,
            displayName: authorInfo ? (authorInfo['Display Name'] || name) : name,
            birthYear: birthYear,
            outgoingRefs: 0
        };
    });

    console.log('Philosophers with birth years:', philosophers);

    philosophers.forEach((philosopher, index) => {
        philosopher.outgoingRefs = matrixData.reduce((sum, row) => {
            if (row[''] === philosopher.name) {
                // Sum all references this philosopher makes to others
                return sum + Object.values(row)
                    .filter((val, i) => i > 0) // Skip the first column (names)
                    .reduce((a, b) => a + (parseInt(b) || 0), 0);
            }
            return sum;
        }, 0);
        
        philosopher.incomingRefs = matrixData.reduce((sum, row) => {
            const value = parseInt(row[philosopher.name]) || 0;
            return sum + value;
        }, 0);
    });


    philosophers.sort((a, b) => b.incomingRefs - a.incomingRefs);

    const initialPhilosophers = philosophers.slice(0, 15);
    const validPhilosophers = philosophers.filter(p => p.birthYear !== null);

    console.log('All philosophers:', philosophers);
    console.log('Top 30:', initialPhilosophers);
    console.log('Valid philosophers:', validPhilosophers);

    const controls = d3.select('body')
        .append('div')
        .attr('class', 'controls')
        .style('position', 'absolute')
        .style('right', '40px')
        .style('top', '40px')
        .style('max-height', '80vh')
        .style('width', '400px')
        .style('overflow-y', 'auto')
        .style('background', 'white')
        .style('padding', '10px')
        .style('border', '1px solid #ccc')
        .style('box-shadow', '0 2px 5px rgba(0,0,0,0.1)')
        .style('z-index', '1000');

    // add dataset selector as first control
    const datasetContainer = controls.append('div')
        .style('margin-bottom', '15px')
        .style('padding', '10px')
        .style('border-bottom', '1px solid #ccc')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '10px');

    datasetContainer.append('label')
        .text('Dataset: ')
        .style('margin-right', '10px');

    const bubbleContainer = datasetContainer.append('div')
        .style('display', 'flex')
        .style('flex-wrap', 'wrap')              // wrapping
        .style('gap', '8px')                     // consistent gap between rows and columns
        .style('justify-content', 'flex-start'); // align to start instead of space-between

    const bubbles = bubbleContainer.selectAll('.dataset-bubble')
        .data(datasets)
        .enter()
        .append('div')
        .attr('class', 'dataset-bubble')
        .style('display', 'inline-block')
        .style('margin', '0')
        .style('padding', '5px 15px')
        .style('border', '2px solid black')
        .style('border-radius', '20px')
        .style('cursor', 'pointer')
        .style('transition', 'all 0.2s ease')
        .style('flex', '0 1 auto')               // don't grow, but allow shrinking
        .style('text-align', 'center')
        .style('background-color', d => d.value === currentDataset ? 'steelblue' : 'white')
        .style('color', d => d.value === currentDataset ? 'white' : 'black')
        .text(d => d.text)
        .on('click', function(event, d) {
            if (d.value !== currentDataset) {
                const isDarkMode = d3.select('#darkModeToggle').property('checked');
                
                bubbles
                    .style('background-color', data => {
                        if (data.value === d.value) return 'steelblue';
                        return isDarkMode ? '#1a1a1a' : 'white';
                    })
                    .style('color', data => data.value === d.value ? 'white' : (isDarkMode ? 'white' : 'black'));
                
                currentDataset = d.value;
                
                Promise.all([
                    d3.csv(datasetUrls[d.value].matrix),
                    d3.csv(datasetUrls[d.value].list)
                ]).then(([newMatrixData, newListData]) => {
                    loadVisualization(newMatrixData, newListData);
                    if (isDarkMode) {
                        d3.select('#darkModeToggle').property('checked', true);
                        applyDarkMode(true);
                    }
                }).catch(error => {
                    console.error('Error loading the CSV files:', error);
                });
            }
        })
        .on('mouseover', function() {
            const isDarkMode = d3.select('#darkModeToggle').property('checked');
            const isSelected = d3.select(this).datum().value === currentDataset;
            if (!isSelected) {
                d3.select(this)
                    .style('background-color', isDarkMode ? '#333' : '#f0f0f0');
            }
        })
        .on('mouseout', function(event, d) {
            const isDarkMode = d3.select('#darkModeToggle').property('checked');
            const isSelected = d.value === currentDataset;
            if (!isSelected) {
                d3.select(this)
                    .style('background-color', isDarkMode ? '#1a1a1a' : 'white');
            }
        });

    const darkModeContainer = controls.append('div')
        .style('margin-bottom', '15px')
        .style('padding', '10px')
        .style('border-bottom', '1px solid #ccc');

    // Add dark mode toggle button to controls
    darkModeContainer.append('label')
        .text('Dark Mode: ')
        .style('display', 'block')
        .style('margin-bottom', '5px');

    darkModeContainer.append('input')
        .attr('type', 'checkbox')
        .attr('id', 'darkModeToggle')
        .on('change', toggleDarkMode);

    
    const thresholdContainer = controls.append('div')
        .style('padding', '10px')
        .style('border-bottom', '1px solid #ccc');

    thresholdContainer.append('label')
        .text('Line Threshold: ')
        .style('display', 'block')
        .style('margin-bottom', '5px');

    const thresholdValue = thresholdContainer.append('span')
        .text('5');

    thresholdContainer.append('input')
        .attr('type', 'range')
        .attr('min', 0)
        .attr('max', 40)
        .attr('value', 5)
        .style('width', '100%')
        .on('input', function() {
            thresholdValue.text(this.value);
            updateVisibility();
        });

    const focalPointSection = controls.append('div')
        .style('padding', '10px')
        .style('border-bottom', '1px solid #ccc');

    focalPointSection.append('div')
        .style('margin-bottom', '10px')
        .text('Select Focal Point');

    // search bar
    const searchContainer = focalPointSection.append('div')
        .style('margin-bottom', '15px');

    const searchInput = searchContainer.append('input')
        .attr('type', 'text')
        .attr('placeholder', 'Search philosopher...')
        .style('width', '100%')
        .style('padding', '5px')
        .style('margin-bottom', '5px');

    // dropdown for search results
    const searchResults = searchContainer.append('div')
        .style('display', 'none')
        .style('position', 'absolute')
        .style('background', 'white')
        .style('border', '1px solid #ccc')
        .style('max-height', '150px')
        .style('overflow-y', 'auto')
        .style('width', '180px')
        .style('z-index', '1000');

    // Incoming references slider
    const incomingSlider = focalPointSection.append('div')
        .style('margin-bottom', '15px');

    incomingSlider.append('label')
        .text('Number of Incoming References: ')
        .style('display', 'block')
        .style('margin-bottom', '5px');

    const incomingValue = incomingSlider.append('span')
        .text('0');

    incomingSlider.append('input')
        .attr('type', 'range')
        .attr('min', 0)
        .attr('max', 20)
        .attr('value', 0)
        .style('width', '100%')
        .on('input', function() {
            incomingValue.text(this.value);
            updateFocalPoint();
        });

    //   add outgoing references slider
    const outgoingSlider = focalPointSection.append('div')
        .style('margin-bottom', '15px');

    outgoingSlider.append('label')
        .text('Number of Outgoing References: ')
        .style('display', 'block')
        .style('margin-bottom', '5px');

    const outgoingValue = outgoingSlider.append('span')
        .text('0');

    outgoingSlider.append('input')
        .attr('type', 'range')
        .attr('min', 0)
        .attr('max', 20)
        .attr('value', 0)
        .style('width', '100%')
        .on('input', function() {
            outgoingValue.text(this.value);
            updateFocalPoint();
        });

    let selectedPhilosopher = null;

    searchInput.on('input', function() {
        const searchTerm = this.value.toLowerCase();
        if (!searchTerm) {
            searchResults.style('display', 'none');
            return;
        }

        const matches = validPhilosophers
            .filter(p => p.name.toLowerCase().includes(searchTerm))
            .slice(0, 5); // Up to five

        searchResults
            .style('display', matches.length ? 'block' : 'none')
            .selectAll('div')
            .data(matches)
            .join('div')
            .style('padding', '5px')
            .style('cursor', 'pointer')
            .style('hover', 'background: #f0f0f0')
            .style('color', 'black')
            .text(d => d.displayName)
            .on('click', function(event, d) {
                selectedPhilosopher = d;
                searchInput.property('value', d.displayName);
                searchResults.style('display', 'none');
                updateFocalPoint();
            });
    });

    // function to update visualization based on focal point
    function updateFocalPoint() {
        if (!selectedPhilosopher) return;

        const incomingCount = parseInt(d3.select(incomingSlider.node()).select('input').property('value'));
        const outgoingCount = parseInt(d3.select(outgoingSlider.node()).select('input').property('value'));

        // top incoming references
        const topIncoming = matrixData
            .map(row => ({
                philosopher: row[''],
                references: parseInt(row[selectedPhilosopher.name]) || 0
            }))
            .filter(d => d.philosopher !== selectedPhilosopher.name && d.references > 0)
            .sort((a, b) => b.references - a.references)
            .slice(0, incomingCount)
            .map(d => d.philosopher);

        // top outgoing references
        const selectedRow = matrixData.find(row => row[''] === selectedPhilosopher.name);
        const topOutgoing = Object.entries(selectedRow || {})
            .filter(([key, value]) => key !== '' && key !== selectedPhilosopher.name)
            .map(([key, value]) => ({
                philosopher: key,
                references: parseInt(value) || 0
            }))
            .filter(d => d.references > 0)
            .sort((a, b) => b.references - a.references)
            .slice(0, outgoingCount)
            .map(d => d.philosopher);

        // Combine all philosophers to show
        const philosophersToShow = new Set([
            selectedPhilosopher.name,
            ...topIncoming,
            ...topOutgoing
        ]);

        // update checkboxes
        d3.selectAll('input[type="checkbox"]')
            .property('checked', function() {
                return philosophersToShow.has(this.id);
            });

        
        updateVisibility();

        
        g.selectAll('.point-group')
            .each(function(d) {
                const isFocal = d.name === selectedPhilosopher.name;
                d3.select(this).selectAll('circle')
                    .style('fill', isFocal ? '#8A2BE2' : 'steelblue')
                    .style('opacity', function() {
                        const isLargeCircle = d3.select(this).attr('r') > 4;
                        return isLargeCircle ? 0.2 : 1;
                    });
            });
    }


    const checkboxesHeader = controls.append('div')
        .style('padding', '10px')
        .style('cursor', 'pointer')
        .style('user-select', 'none')
        .style('border-bottom', '1px solid #ccc');

    checkboxesHeader.append('span')
        .text('Select Philosophers: ');

    checkboxesHeader.append('span')
        .text('▼')
        .attr('class', 'collapse-arrow')
        .style('font-size', '0.8em')
        .style('margin-left', '5px');

    const checkboxesContainer = controls.append('div')
        .attr('class', 'checkboxes-container')
        .style('transition', 'max-height 0.3s ease-out');

    checkboxesHeader.on('click', function() {
        const container = d3.select('.checkboxes-container');
        const arrow = d3.select('.collapse-arrow');
        const isCollapsed = container.style('display') === 'none';
        
        container.style('display', isCollapsed ? 'block' : 'none');
        arrow.text(isCollapsed ? '▼' : '▶');
    });

    checkboxesContainer.selectAll('div.philosopher-control')
        .data(validPhilosophers)
        .enter()
        .append('div')
        .attr('class', 'philosopher-control')
        .style('margin', '5px')
        .each(function(d, i) {
            console.log('Creating control for:', d.name);
            const div = d3.select(this);
            div.append('input')
                .attr('type', 'checkbox')
                .attr('id', d => d.name)
                .attr('checked', initialPhilosophers.includes(d) ? true : null)
                .on('change', updateVisibility);
            div.append('label')
                .attr('for', d => d.name)
                .style('margin-left', '5px')
                .text(d => d.displayName);
        });

    console.log('Creating controls for philosophers:', validPhilosophers);
    
    console.log('Created checkboxes:', 
        Array.from(document.querySelectorAll('input[type="checkbox"]'))
            .map(cb => cb.id)
    );

    function updateVisibility() {
        const checkedPhilosophers = new Set(
            Array.from(document.querySelectorAll('input:checked'))
                .map(checkbox => checkbox.id)
        );
        
        console.log('Currently checked philosophers:', Array.from(checkedPhilosophers));

        const activePhilosophers = validPhilosophers.filter(p => 
            checkedPhilosophers.has(p.name)
        );

        console.log('Active philosophers after filtering:', 
            activePhilosophers.map(p => p.name));

        // Debug Plato specifically
        const platoActive = activePhilosophers.find(p => p.name === 'Plato');
        console.log('Plato status:', {
            inChecked: checkedPhilosophers.has('Plato'),
            inActive: !!platoActive,
            data: platoActive
        });

        activePhilosophers.forEach(philosopher => {
            if (philosopher.name === 'Plato') {
                console.log('Recalculating Plato references...');
                console.log('Before:', {
                    outgoing: philosopher.outgoingRefs,
                    incoming: philosopher.incomingRefs
                });
            }

            // Outgoing references (for y-axis position)
            philosopher.outgoingRefs = matrixData.reduce((sum, row) => {
                if (row[''] === philosopher.name && checkedPhilosophers.has(row[''])) {
                    // Only count references to checked philosophers
                    return sum + Array.from(checkedPhilosophers)
                        .map(name => parseInt(row[name]) || 0)
                        .reduce((a, b) => a + b, 0);
                }
                return sum;
            }, 0);

            // Incoming references (for bubble size)
            philosopher.incomingRefs = matrixData.reduce((sum, row) => {
                if (checkedPhilosophers.has(row[''])) {
                    return sum + (parseInt(row[philosopher.name]) || 0);
                }
                return sum;
            }, 0);

            if (philosopher.name === 'Plato') {
                console.log('After:', {
                    outgoing: philosopher.outgoingRefs,
                    incoming: philosopher.incomingRefs
                });
            }
        });

        // update both x and y scales w/ new domains
        xScale.domain(d3.extent(activePhilosophers, d => d.birthYear)).nice();
        yScale.domain([0, d3.max(activePhilosophers, d => d.outgoingRefs)]).nice();

        // update x-axis w/ animation
        g.select('.x-axis')
            .transition()
            .duration(500)
            .call(d3.axisBottom(xScale)
                .tickFormat(d => Math.abs(d) + (d < 0 ? ' BCE' : ' CE')));

        // update y-axis
        g.select('.y-axis')
            .transition()
            .duration(500)
            .call(d3.axisLeft(yScale));

        // Update grid lines
        g.select('.grid.x')
            .transition()
            .duration(500)
            .call(d3.axisBottom(xScale)
                .tickSize(-innerHeight)
                .tickFormat(''));

        g.select('.grid.y')
            .transition()
            .duration(500)
            .call(d3.axisLeft(yScale)
                .tickSize(-innerWidth)
                .tickFormat(''));

        g.selectAll('.point-group circle:first-child')
            .transition()
            .duration(500)
            .attr('r', d => Math.pow(d.incomingRefs, 1/2) * 4)
            .style('opacity', 0.2);

        g.selectAll('.point-group circle:last-child')
            .style('opacity', 1);

        // animation for updating points
        g.selectAll('.point-group')
            .style('display', d => 
                checkedPhilosophers.has(d.name) ? null : 'none'
            )
            .transition()
            .duration(500)
            .attr('transform', d => `translate(${xScale(d.birthYear)},${yScale(d.outgoingRefs)})`);

        
        g.selectAll('.point-group')
            .each(function(d) {
                const isFocal = selectedPhilosopher && d.name === selectedPhilosopher.name;
                d3.select(this).selectAll('circle')
                    .style('fill', isFocal ? '#8A2BE2' : 'steelblue');
            });


        g.selectAll('.label')
            .style('display', d => 
                checkedPhilosophers.has(d.name) ? null : 'none'
            )
            .transition()
            .duration(500)
            .attr('x', d => xScale(d.birthYear))
            .attr('y', d => yScale(d.outgoingRefs) - 8);


        updateLinks();
    }

    // SVG container
    const svg = d3.select('body')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('overflow', 'visible');

    //  chart group
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    //  scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(validPhilosophers, d => d.birthYear))
        .range([0, innerWidth])
        .nice();

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(validPhilosophers, d => d.outgoingRefs)])
        .range([innerHeight, 0])
        .nice();

    // Add grid lines
    g.append('g')
        .attr('class', 'grid x')
        .attr('transform', `translate(0, ${innerHeight})`)
        .style('stroke-dasharray', '3,3')
        .style('color', 'rgba(0,0,0,0.2)')
        .call(d3.axisBottom(xScale)
            .tickSize(-innerHeight)
            .tickFormat(''));

    g.append('g')
        .attr('class', 'grid y')
        .style('stroke-dasharray', '3,3')
        .style('color', 'rgba(0,0,0,0.2)')
        .call(d3.axisLeft(yScale)
            .tickSize(-innerWidth)
            .tickFormat(''));

    // add axes (only once)
    g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale)
            .tickFormat(d => Math.abs(d) + (d < 0 ? ' BCE' : ' CE')));

    g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(yScale));

    // Add axis labels
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 40)
        .attr('text-anchor', 'middle')
        .text('Birth Year');

    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -60)
        .attr('text-anchor', 'middle')
        .text('Total Outgoing References');

    // add arrow marker definition to SVG
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'steelblue');

    
    const linksGroup = g.append('g')
        .attr('class', 'links')
        .attr('opacity', 0.3); 

    function updateLinks() {
        const threshold = parseInt(d3.select('input[type="range"]').property('value'));
        // Create array of links from visible philosophers
        const links = [];
        const checkedPhilosophers = new Set(
            Array.from(document.querySelectorAll('input:checked'))
                .map(checkbox => checkbox.id)
        );

        // First, collect all bidirectional pairs above threshold
        const bidirectionalPairs = new Set();
        matrixData.forEach(row => {
            const source = row[''];
            Object.entries(row).forEach(([target, value]) => {
                if (target !== '' && parseInt(value) >= threshold) {
                    
                    const targetRow = matrixData.find(r => r[''] === target);
                    if (targetRow && parseInt(targetRow[source]) >= threshold) {
                        
                        const pair = [source, target].sort().join('->');
                        bidirectionalPairs.add(pair);
                    }
                }
            });
        });

        matrixData.forEach(row => {
            const source = row[''];
            if (checkedPhilosophers.has(source)) {
                Object.entries(row).forEach(([target, value]) => {
                    const referenceCount = parseInt(value);
                    if (target !== '' && 
                        checkedPhilosophers.has(target) && 
                        referenceCount >= threshold) {
                        const sourcePhil = validPhilosophers.find(p => p.name === source);
                        const targetPhil = validPhilosophers.find(p => p.name === target);
                        
                        //  if this is part of a bidirectional pair:
                        const pairKey = [source, target].sort().join('->');
                        const isBidirectional = bidirectionalPairs.has(pairKey);
                        
                        // for bidirectional pairs, curve one up and one down
                        const curveDirection = isBidirectional ? 
                            (source < target ? 1 : -1) : 1;
                        
                        links.push({
                            source: sourcePhil,
                            target: targetPhil,
                            value: referenceCount,
                            id: `${source}->${target}`,
                            curveDirection: curveDirection
                        });
                    }
                });
            }
        });

        const linkElements = linksGroup.selectAll('.link')
            .data(links, d => d.id);

        linkElements.exit().remove();

        const newLinks = linkElements.enter()
            .append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 1)
            .attr('marker-end', 'url(#arrowhead)')
            .style('opacity', 0.3);

        // Merge new & existing links
        const allLinks = newLinks.merge(linkElements)
            .attr('d', d => {
                const sourceX = xScale(d.source.birthYear);
                const sourceY = yScale(d.source.outgoingRefs);
                const targetX = xScale(d.target.birthYear);
                const targetY = yScale(d.target.outgoingRefs);
                
                const midX = (sourceX + targetX) / 2;
                const midY = (sourceY + targetY) / 2;
                
                const heightMultiplier = 0.2;
                const controlY = midY - (Math.abs(targetX - sourceX) * heightMultiplier * d.curveDirection);
                
                return d3.line().curve(d3.curveNatural)([
                    [sourceX, sourceY],
                    [midX, controlY],
                    [targetX, targetY]
                ]);
            });

        // event listeners for all links
        allLinks
            .on('mouseover', function(event, d) {
                // remove any existing tooltips
                d3.selectAll('.tooltip').remove();
                
                d3.select(this)
                    .style('opacity', 1)
                    .attr('stroke-width', 2);
                
                // add tooltip
                const tooltip = d3.select('body').append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('background', 'white')  // always white background
                    .style('color', 'black')       // always black text
                    .style('padding', '5px')
                    .style('border', '1px solid #ccc')
                    .style('border-radius', '3px')
                    .style('pointer-events', 'none')
                    .style('opacity', 0);

                tooltip.html(`${d.source.displayName} → ${d.target.displayName}<br>References: ${d.value}`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px')
                    .transition()
                    .duration(200)
                    .style('opacity', 1);
            })
            .on('mousemove', function(event) {
                d3.select('.tooltip')
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('opacity', 0.3)
                    .attr('stroke-width', 1);
                
                d3.selectAll('.tooltip').remove();
            });

        linksGroup.attr('opacity', null);
    }

    // points creation to include hover and double-click functionality
    const points = g.selectAll('.point-group')
        .data(validPhilosophers)
        .enter()
        .append('g')
        .attr('class', 'point-group')
        .attr('transform', d => `translate(${xScale(d.birthYear)},${yScale(d.outgoingRefs)})`)
        .on('mouseover', function(event, d) {
            // add stroke to both circles
            d3.select(this).selectAll('circle')
                .style('stroke', 'black')
                .style('stroke-width', '1px')
                .style('opacity', function() {
                    const isLargeCircle = d3.select(this).attr('r') > 4;
                    return isLargeCircle ? 0.2 : 1;
                });

            // remove any existing tooltips
            d3.selectAll('.tooltip').remove();
            
            const tooltip = d3.select('body').append('div')
                .attr('class', 'tooltip')
                .style('position', 'absolute')
                .style('background', 'white')
                .style('color', 'black')
                .style('padding', '5px')
                .style('border', '1px solid #ccc')
                .style('border-radius', '3px')
                .style('pointer-events', 'none')
                .style('opacity', 0);

            tooltip.html(`${d.displayName}<br>Incoming References: ${d.incomingRefs}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px')
                .transition()
                .duration(200)
                .style('opacity', 1);
        })
        .on('mouseout', function() {
            d3.select(this).selectAll('circle')
                .style('stroke', null)
                .style('stroke-width', null);
            
            d3.selectAll('.tooltip').remove();
        })
        .on('dblclick', function(event, d) {
            const checkbox = document.getElementById(d.name);
            if (checkbox) {
                checkbox.checked = false;
                checkbox.dispatchEvent(new Event('change'));
            }
        });

    points.append('circle')
        .attr('r', d => Math.pow(d.incomingRefs, 1/2) * 4)
        .attr('fill', 'steelblue')
        .attr('opacity', 0.2);

    points.append('circle')
        .attr('r', 4)
        .attr('fill', 'steelblue');

    g.selectAll('text.label')
        .data(validPhilosophers)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', d => xScale(d.birthYear))
        .attr('y', d => yScale(d.outgoingRefs) - 8)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .text(d => d.displayName);

    updateLinks();

    updateVisibility();
}

// Update initial load
Promise.all([
    d3.csv(datasetUrls.philosophers.matrix),
    d3.csv(datasetUrls.philosophers.list)
]).then(([matrixData, authorsData]) => {
    loadVisualization(matrixData, authorsData);
}).catch(error => {
    console.error('Error loading the CSV files:', error);
});
