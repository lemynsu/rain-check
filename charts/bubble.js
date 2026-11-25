// Bubble chart
// Typical month in LA and Taipei. x = temperature, y = sunshine, area = rainfall.

const bubble = (() => {
  // ---- Setup (runs once) ----
  const width = 560, height = 300;
  const margin = { top: 20, right: 76, bottom: 40, left: 40 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const color = d3.scaleOrdinal().domain(['LA', 'Taipei']).range(['#FBE07A', '#1157E4']);

  const svg = d3.select('#bubble').append('svg')
    .attr('viewBox', [0, 0, width, height])
    .attr('role', 'img')
    .attr('aria-label', 'Monthly temperature, sunshine and rainfall in LA and Taipei');

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().range([0, innerW]);    // temperature
  const y = d3.scaleLinear().range([innerH, 0]);    // sunshine
  const r = d3.scaleSqrt().range([0, 22]);          // sqrt: circle AREA tracks rainfall

  const xAxisG = g.append('g').attr('class', 'axis grid')
    .attr('transform', `translate(0,${innerH})`);
  const yAxisG = g.append('g').attr('class', 'axis grid');
  const bubblesG = g.append('g');

  g.append('text').attr('class', 'unit')
    .attr('x', -margin.left).attr('y', -8)
    .text('Sunshine h/day');
  const xLabel = g.append('text').attr('class', 'unit')
    .attr('x', innerW).attr('y', innerH + 34)
    .attr('text-anchor', 'end');

  // Size legend: nested reference circles in the right margin
  const legendG = g.append('g')
    .attr('transform', `translate(${innerW + 44},${innerH})`);

  // Adds a little room around the data so edge bubbles aren't cut off
  const padded = ([lo, hi], p) => [lo - p, hi + p];

  // ---- Update (data join) ----
  function update(data) {
    x.domain(padded(d3.extent(allData, d => d.temp_mean), 1.5).map(units.temp)).nice();
    y.domain(padded(d3.extent(allData, d => d.sunshine), 1)).nice();
    r.domain([0, d3.max(allData, d => d.precip)]);

    bubblesG.selectAll('circle')
      .data(d3.sort(data, (a, b) => b.precip - a.precip),
            d => `${d.city}-${d.month}`)
      .join('circle')
        .attr('cx', d => x(units.temp(d.temp_mean)))
        .attr('cy', d => y(d.sunshine))
        .attr('r', d => r(d.precip))
        .attr('fill', d => color(d.city))
        .attr('fill-opacity', 0.45)
        .attr('stroke', d => color(d.city))
        .attr('data-month', d => d.month)
      .order();

    xLabel.text(`Monthly mean temperature ${units.label()}`);

    xAxisG.call(d3.axisBottom(x).ticks(6).tickSize(-innerH))
      .call(a => a.select('.domain').remove());
    yAxisG.call(d3.axisLeft(y).ticks(5).tickSize(-innerW))
      .call(a => a.select('.domain').remove());

    // Size legend uses the same r scale as the bubbles
    const refs = [200, 50];
    legendG.selectAll('circle')
      .data(refs)
      .join('circle')
        .attr('cy', v => -r(v))
        .attr('r', v => r(v))
        .attr('fill', 'none')
        .style('stroke', 'var(--muted)');
    legendG.selectAll('text')
      .data(refs)
      .join('text')
        .attr('class', 'unit')
        .attr('y', v => -2 * r(v) - 4)
        .attr('text-anchor', 'middle')
        .text(v => `${v} mm`);
  }

  // ---- Load data, then draw ----
  let allData = [];
  d3.csv('data/monthly-avg.csv', d3.autoType).then(data => {
    allData = data;
    update(allData);
  });

  return { update, getData: () => allData };
})();
