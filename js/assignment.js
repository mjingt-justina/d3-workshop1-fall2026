
 // STOCK PRICE VISUALIZATION ASSIGNMENT

// DATA LOADING
let stocks = await Promise.all([
    d3.csv('data/AAPL.csv').then(data => ({ name: 'AAPL', values: data })),
    d3.csv('data/GOOG.csv').then(data => ({ name: 'GOOG', values: data })),
    d3.csv('data/AMZN.csv').then(data => ({ name: 'AMZN', values: data })),
    d3.csv('data/IBM.csv').then(data => ({ name: 'IBM', values: data })),
    d3.csv('data/MSFT.csv').then(data => ({ name: 'MSFT', values: data }))
]);

// DATA PROCESSING
stocks.forEach(stock => {
    stock.values.forEach(d => {
        d.Date = new Date(d.Date);
        d.Close = +d.Close;
        d.Open = +d.Open;
        d.High = +d.High;
        d.Low = +d.Low;
        d.Volume = +d.Volume;
    });
    stock.values.sort((a, b) => a.Date - b.Date);
});

// CHART DIMENSIONS
const margin = { top: 50, right: 160, bottom: 50, left: 100 };
const width = 1000 - margin.left - margin.right;
const height = 800 - margin.top - margin.bottom;

// SVG SETUP
const svg = d3.select('#chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

// CREATE SCALES
const allValues = stocks.flatMap(s => s.values);

const x = d3.scaleUtc()
    .domain(d3.extent(allValues, d => d.Date))
    .range([0, width]);

const y = d3.scaleLinear()
    .domain([
        d3.min(allValues, d => d.Close),
        d3.max(allValues, d => d.Close)
    ])
    .range([height, 0]);

const color = d3.scaleOrdinal(d3.schemeCategory10)
    .domain(stocks.map(s => s.name));

// ADD AXES
const xAxis = d3.axisBottom(x)
    .ticks(d3.utcYear.every(1))
    .tickFormat(d3.utcFormat('%Y'));

svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height})`)
    .call(xAxis)
    .selectAll('text')
    .style('font-size', '12px');

const yAxis = d3.axisLeft(y)
    .ticks(10)
    .tickFormat(d => `$${d.toFixed(0)}`);

svg.append('g')
    .attr('class', 'y-axis')
    .call(yAxis)
    .selectAll('text')
    .style('font-size', '12px');

// DRAW LINES
const line = d3.line()
    .x(d => x(d.Date))
    .y(d => y(d.Close))
    .curve(d3.curveMonotoneX);

stocks.forEach(stock => {
    svg.append('path')
        .datum(stock.values)
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke', color(stock.name))
        .attr('stroke-width', 2)
        .attr('d', line);
});

// TOOLTIP AND VERTICAL GUIDE LINE
const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('background', 'rgba(20, 23, 26, 0.92)')
    .style('color', '#ffffff')
    .style('padding', '6px 10px')
    .style('border-radius', '4px')
    .style('font-size', '13px')
    .style('line-height', '1.4');

const bisect = d3.bisector(d => d.Date).center;
const fmtDate = d3.utcFormat('%b %d, %Y');

const guide = svg.append('line')
    .attr('class', 'guide')
    .attr('y1', 0)
    .attr('y2', height)
    .attr('stroke', '#888888')
    .attr('stroke-dasharray', '4 4')
    .style('opacity', 0);

svg.append('rect')
    .attr('class', 'overlay')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .on('mouseover', function () {
        tooltip.style('opacity', 1);
        guide.style('opacity', 1);
    })
    .on('mousemove', function (event) {
        const [px] = d3.pointer(event, this);
        const date = x.invert(Math.max(0, Math.min(width, px)));

        const rows = stocks
            .map(s => ({
                name: s.name,
                row: s.values[bisect(s.values, date)]
            }))
            .sort((a, b) => b.row.Close - a.row.Close);

        const guideX = x(rows[0].row.Date);
        guide.attr('x1', guideX).attr('x2', guideX);

        tooltip.html(
            `<strong>${fmtDate(rows[0].row.Date)}</strong>` +
            rows.map(r =>
                `<br><span style="color:${color(r.name)}">&#9632;</span> ${r.name}: $${r.row.Close.toFixed(2)}`
            ).join('')
        );

        tooltip
            .style('left', `${event.pageX + 16}px`)
            .style('top', `${event.pageY - 28}px`);
    })
    .on('mouseout', function () {
        tooltip.style('opacity', 0);
        guide.style('opacity', 0);
    });

// ADD LABELS
svg.append('text')
    .attr('class', 'chart-title')
    .attr('x', width / 2)
    .attr('y', -20)
    .attr('text-anchor', 'middle')
    .style('font-size', '18px')
    .style('font-weight', 'bold')
    .text('Stock Closing Prices Over Time');

svg.append('text')
    .attr('class', 'x-axis-label')
    .attr('x', width / 2)
    .attr('y', height + 45)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .text('Year');

svg.append('text')
    .attr('class', 'y-axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -70)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .text('Closing Price (USD)');

// ADD LEGEND
const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${width + 20}, 0)`);

stocks.forEach((stock, i) => {
    const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);

    legendRow.append('line')
        .attr('x1', 0)
        .attr('y1', 5)
        .attr('x2', 18)
        .attr('y2', 5)
        .attr('stroke', color(stock.name))
        .attr('stroke-width', 2);

    legendRow.append('text')
        .attr('x', 24)
        .attr('y', 9)
        .attr('text-anchor', 'start')
        .style('font-size', '12px')
        .text(stock.name);
});
