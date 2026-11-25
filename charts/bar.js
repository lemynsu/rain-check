// Bar chart
// Average monthly rainfall, LA vs Taipei (2023 to 2024).

const bar = (() => {
  // ---- Setup (runs once) ----
  const width = 560, height = 300;
  const margin = { top: 20, right: 8, bottom: 28, left: 40 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const CITIES = ['LA', 'Taipei'];
  const color = d3.scaleOrdinal().domain(CITIES).range(['#FBE07A', '#1157E4']);
  // 600 ms animation, or none if the user turned on Reduce Motion
  const DURATION = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600;
  

  const svg = d3.select('#bar').append('svg')
    .attr('viewBox', [0, 0, width, height])        // scales to the card width
    .attr('role', 'img')
    .attr('aria-label', 'Average monthly rainfall in LA and Taipei');

  // Linked view: index.html sets this. bar.js just reports the hovered month.
  let hoverHandler = () => {};
  svg.on('mouseleave.link', () => hoverHandler(null));   // leaving the chart clears it

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x0 = d3.scaleBand()                         // one band per month
    .domain(d3.range(1, 13))
    .range([0, innerW])
    .padding(0.2);
  const x1 = d3.scaleBand().padding(0.08);          // one sub-band per city
  const y = d3.scaleLinear().range([innerH, 0]);

  const yAxisG = g.append('g').attr('class', 'axis grid');
  const xAxisG = g.append('g').attr('class', 'axis')
    .attr('transform', `translate(0,${innerH})`);
  const barsG = g.append('g');                      // drawn after the grid, so bars sit on top

  g.append('text')                                  // unit label
    .attr('class', 'unit')
    .attr('x', -margin.left).attr('y', -8)
    .text('mm');

    // ---- Update (data join) ----
  function update(data) {
    const cities = CITIES.filter(c => data.some(d => d.city === c));
    x1.domain(cities).range([0, x0.bandwidth()]);
    y.domain([0, d3.max(allData, d => d.precip)]).nice();

    const t = svg.transition().duration(DURATION).ease(d3.easeCubicOut);

    barsG.selectAll('rect')
      .data(data, d => `${d.city}-${d.month}`)
      .join(
        enter => enter.append('rect')             // new bars start flat on the x axis
          .attr('x', d => x0(d.month) + x1(d.city))
          .attr('width', x1.bandwidth())
          .attr('y', innerH)
          .attr('height', 0),
        update => update,                         // existing bars: nothing special here
        exit => exit.transition(t)                // leaving bars shrink, then are removed
          .attr('y', innerH)
          .attr('height', 0)
          .remove()
      )
        .attr('rx', 2)
        .attr('fill', d => color(d.city))
        .attr('data-month', d => d.month)
        .on('mouseenter.link', (event, d) => hoverHandler(d.month))
      .transition(t)                              // all remaining bars animate to their place
        .attr('x', d => x0(d.month) + x1(d.city))
        .attr('width', x1.bandwidth())
        .attr('y', d => y(d.precip))
        .attr('height', d => innerH - y(d.precip));

    xAxisG.call(d3.axisBottom(x0).tickFormat(m => MONTHS[m - 1]).tickSizeOuter(0));
    yAxisG.call(d3.axisLeft(y).ticks(5).tickSize(-innerW))
      .call(a => a.select('.domain').remove());
  }

  // ---- Load data, then draw ----
  let allData = [];
  d3.csv('data/monthly-avg.csv', d3.autoType).then(data => {
    allData = data;
    update(allData);
  });

    return {
    update,
    getData: () => allData,
    onHover: fn => { hoverHandler = fn; }      // lets index.html subscribe to hovers
  };        // used by the Step 3 filter
})();
