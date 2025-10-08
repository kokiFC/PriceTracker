document.addEventListener('DOMContentLoaded', () => {
    fetch('price_data.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(csvText => {
            const lines = csvText.trim().split('\n');
            const headers = lines[0].split(',');
            const data = lines.slice(1).map(line => {
                const values = line.split(',');
                const row = {};
                headers.forEach((header, index) => {
                    row[header.trim()] = values[index].trim();
                });
                return row;
            });

            data.sort((a, b) => new Date(a.date) - new Date(b.date));

            const latestPrices = {};
            data.forEach(item => {
                const productName = item.product;
                const itemDate = new Date(item.date);

                if (!latestPrices[productName] || itemDate > new Date(latestPrices[productName].date)) {
                    latestPrices[productName] = {
                        date: item.date,
                        price: item.price
                    };
                }
            });

            const productTableBody = document.getElementById('productTable').getElementsByTagName('tbody')[0];

            function isValidPrice(price) {
                const priceValue = parseFloat(price);
                return !isNaN(priceValue) && priceValue.toString().length <= 10;
            }

            for (const product in latestPrices) {
                if (isValidPrice(latestPrices[product].price)) {
                    const row = productTableBody.insertRow();
                    const nameCell = row.insertCell(0);
                    const priceCell = row.insertCell(1);
                    nameCell.textContent = product;
                    priceCell.textContent = parseFloat(latestPrices[product].price).toFixed(2);
                }
            }

            const products = [...new Set(data.map(item => item.product))];
            const productFilter = document.getElementById('productFilter');
            let priceChart;

            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Products';
            productFilter.appendChild(allOption);

            products.forEach((product, index) => {
                const option = document.createElement('option');
                option.value = product;
                option.textContent = product;
                productFilter.appendChild(option);
                if (index === 0) {
                    option.selected = true;
                }
            });

            function updateChart(selectedProduct = 'all') {
                const filteredData = selectedProduct === 'all' ? data : data.filter(item => item.product === selectedProduct);

                const colorPalette = [
                    '#E6194B', '#3CB44B', '#FFE119', '#4363D8', '#F58231', '#911EB4',
                    '#46F0F0', '#F032E6', '#BCF60C', '#FABEBE', '#008080', '#E6BEFF',
                    '#9A6324', '#FFFAC8', '#800000', '#AAFFC3', '#808000', '#FFD8B1',
                    '#000075', '#808080'
                ];

                const currentProducts = [...new Set(filteredData.map(item => item.product))];
                const datasets = currentProducts.map((product, index) => {
                    const productData = filteredData.filter(item => item.product === product)
                        .filter(item => isValidPrice(item.price));
                    return {
                        label: product,
                        data: productData.map(item => ({
                            x: luxon.DateTime.fromSQL(item.date).valueOf(),
                            y: parseFloat(item.price)
                        })),
                        borderColor: colorPalette[index % colorPalette.length],
                        fill: false
                    };
                });

                const validPrices = filteredData.map(item => parseFloat(item.price)).filter(price => !isNaN(price) && price.toString().length <= 10);
                let minPrice = 0;
                let maxPrice = 1;

                if (validPrices.length > 0) {
                    minPrice = Math.min(...validPrices);
                    maxPrice = Math.max(...validPrices);
                }

                let priceBuffer = (maxPrice - minPrice) * 0.1;

                if (minPrice === maxPrice) {
                    if (minPrice === 0) {
                        priceBuffer = 0.1;
                    } else {
                        priceBuffer = 1;
                    }
                }

                const yAxisMin = minPrice - priceBuffer;
                const yAxisMax = maxPrice + priceBuffer;

                const chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'time',
                            title: {
                                display: true,
                                text: 'Date'
                            },
                            time: {
                                unit: 'day',
                                stepSize: 1,
                                tooltipFormat: 'MMM d, yyyy',
                                displayFormats: {
                                    day: 'MMM d, yyyy'
                                }
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Price'
                            },
                            min: yAxisMin,
                            max: yAxisMax
                        }
                    },
                    plugins: {
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    }
                };

                if (priceChart) {
                    priceChart.data.datasets = datasets;
                    priceChart.options = chartOptions;
                    priceChart.update();
                } else {
                    const ctx = document.getElementById('priceChart').getContext('2d');
                    priceChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            datasets: datasets
                        },
                        options: chartOptions
                    });
                }
            }

            const initialProduct = productFilter.value;
            updateChart(initialProduct);

            productFilter.addEventListener('change', (event) => {
                updateChart(event.target.value);
            });

        })
        .catch(error => {
            console.error('Error fetching or parsing CSV:', error);
        });
});
