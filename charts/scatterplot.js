// Scatterplot
// Daily mean temperature vs humidity, LA vs Taipei (2023 to 2024)

const scatter = (() => {
  // ---- Setup (runs once) ----
  const width = 560, height = 300;
  const margin = { top: 20, right: 12, bottom: 40, left: 40 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const color = d3.scaleOrdinal().domain(['LA', 'Taipei']).range(['#FBE07A', '#1157E4']);

  const svg = d3.select('#scatterplot').append('svg')
    .attr('viewBox', [0, 0, width, height])
    .attr('role', 'img')
    .attr('aria-label', 'Daily mean temperature versus humidity in LA and Taipei');

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().range([0, innerW]);    // temperature
  const y = d3.scaleLinear().range([innerH, 0]);    // humidity

  const xAxisG = g.append('g').attr('class', 'axis grid')
    .attr('transform', `translate(0,${innerH})`);
  const yAxisG = g.append('g').attr('class', 'axis grid');
  const dotsG = g.append('g');                      // dots drawn on top of the grid

  g.append('text').attr('class', 'unit')            // axis labels
    .attr('x', -margin.left).attr('y', -8)
    .text('Humidity %');
  const xLabel = g.append('text').attr('class', 'unit')
    .attr('x', innerW).attr('y', innerH + 34)
    .attr('text-anchor', 'end');                    // text is set in update()

  // ---- Update (data join) ----
  function update(data) {
    x.domain(d3.extent(allData, d => d.temp_mean).map(units.temp)).nice();
    y.domain(d3.extent(allData, d => d.humidity)).nice();

    dotsG.selectAll('circle')
      .data(data, d => `${d.city}-${d.date}`)
      .join('circle')
        .attr('cx', d => x(units.temp(d.temp_mean)))
        .attr('cy', d => y(d.humidity))
        .attr('r', 2.5)
        .attr('fill', d => color(d.city))
        .attr('fill-opacity', 0.55)
        .attr('data-month', d => d.month);

    xLabel.text(`Daily mean temperature ${units.label()}`);

    xAxisG.call(d3.axisBottom(x).ticks(6).tickSize(-innerH))
      .call(a => a.select('.domain').remove());
    yAxisG.call(d3.axisLeft(y).ticks(5).tickSize(-innerW))
      .call(a => a.select('.domain').remove());
  }

  // ---- Load data, then draw ----
  let allData = [];
  d3.csv('data/daily.csv', d3.autoType).then(data => {
    allData = data;
    update(allData);
  });

  return { update, getData: () => allData };
})();
