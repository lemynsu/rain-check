// Heatmap
// Monthly rainfall by city and year (2023 to 2024)

const heatmap = (() => {
  // ---- Setup (runs once) ----
  const width = 560, height = 300;
  const margin = { top: 20, right: 8, bottom: 56, left: 88};
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const rowKey = d => `${d.city} ${d.year}`;         // e.g. "LA 2023"

  const svg = d3.select('#heatmap').append('svg')
    .attr('viewBox', [0, 0, width, height])
    .attr('role', 'img')
    .attr('aria-label', 'Monthly rainfall by city and year');

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(d3.range(1, 13)).range([0, innerW]).padding(0.06);  // months
  const y = d3.scaleBand().range([0, innerH]).padding(0.06);                          // city-year rows
  const color = d3.scaleSequentialSqrt(d3.interpolateHcl('#1E1E24', '#7FE3F0'));     // dry -> wet

  const xAxisG = g.append('g').attr('class', 'axis')
    .attr('transform', `translate(0,${innerH})`);
  const yAxisG = g.append('g').attr('class', 'axis');
  const cellsG = g.append('g');
    const cityGroupsG = g.append('g');                 // city brackets beside the rows

  // Legend: a gradient bar under the grid, same color scale as the cells
  const legendW = 160;
  const grad = svg.append('defs').append('linearGradient').attr('id', 'heat-grad');
  const legendG = svg.append('g')
    .attr('transform', `translate(${margin.left},${height - 30})`);
  legendG.append('rect')
    .attr('width', legendW).attr('height', 8).attr('rx', 4)
    .attr('fill', 'url(#heat-grad)');
  const legendAxisG = legendG.append('g').attr('class', 'axis')
    .attr('transform', 'translate(0,8)');
  legendG.append('text').attr('class', 'unit')
    .attr('x', legendW + 10).attr('y', 8)
    .text('mm per month');

  // ---- Update (data join) ----
  function update(data) {
    y.domain([...new Set(data.map(rowKey))]);        // rows present in the data
    color.domain([0, d3.max(allData, d => d.precip)]);

    cellsG.selectAll('rect')
      .data(data, d => `${rowKey(d)}-${d.month}`)     // key: one cell per row and month
      .join('rect')
        .attr('x', d => x(d.month))
        .attr('y', d => y(rowKey(d)))
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('rx', 3)
        .attr('fill', d => color(d.precip))
        .attr('data-month', d => d.month);

    xAxisG.call(d3.axisBottom(x).tickFormat(m => MONTHS[m - 1]).tickSize(0).tickPadding(6))
      .call(a => a.select('.domain').remove());
    yAxisG.call(d3.axisLeft(y).tickSize(0).tickPadding(8))
      .call(a => a.select('.domain').remove());
        // Row labels: just the year, in white
    yAxisG.call(d3.axisLeft(y).tickSize(0).tickPadding(8).tickFormat(k => k.split(' ')[1]))
      .call(a => a.select('.domain').remove());
    yAxisG.selectAll('.tick text').attr('fill', '#E8E8EA');

    // City brackets: one per city, spanning that city's rows
    const cities = [...new Set(data.map(d => d.city))];
    cityGroupsG.selectAll('g')
      .data(cities, c => c)                          // key: one bracket per city
      .join(enter => {
        const grp = enter.append('g');
        grp.append('path');
        grp.append('text');
        return grp;
      })
      .each(function (city) {
        const rows = y.domain().filter(k => k.startsWith(city + ' '));
        const top = y(rows[0]) + 4;                                  // first row's top
        const bottom = y(rows.at(-1)) + y.bandwidth() - 4;           // last row's bottom
        const c = city === 'LA' ? '#FBE07A' : '#6B93F5';

        d3.select(this).select('path')                               // a "[" shape
          .attr('d', `M-40,${top} h-4 V${bottom} h4`)
          .attr('fill', 'none')
          .attr('stroke', c);
        d3.select(this).select('text')
          .attr('x', -50)
          .attr('y', (top + bottom) / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'end')
          .attr('fill', c)
          .text(city);
      });

    // Legend: gradient stops from the same interpolator, axis on a matching sqrt scale
    grad.selectAll('stop')
      .data(d3.range(0, 1.01, 0.1))
      .join('stop')
        .attr('offset', t => t)
        .attr('stop-color', t => color.interpolator()(t));
    const legendScale = d3.scaleSqrt().domain(color.domain()).range([0, legendW]);
    legendAxisG.call(d3.axisBottom(legendScale).tickValues([0, 25, 100, 200, 400]).tickSize(3))
      .call(a => a.select('.domain').remove());
  }

  // ---- Load data, then draw ----
  let allData = [];
  d3.csv('data/monthly.csv', d3.autoType).then(data => {
    allData = data;
    update(allData);
  });

  return { update, getData: () => allData };
})();
