document.addEventListener('DOMContentLoaded', () => {
    fetch('price_data.csv')
        .then(response => response.text())
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

            // Sort data by date to ensure the chart line is drawn correctly
            data.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Process data to get the last price for each product
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

            // Populate the product table
            const productTableBody = document.getElementById('productTable').getElementsByTagName('tbody')[0];

            // Function to validate price
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
                    priceCell.textContent = parseFloat(latestPrices[product].price).toFixed(2); // Format price to 2 decimal places
                }
            }

            const products = [...new Set(data.map(item => item.product))];
            const productFilter = document.getElementById('productFilter');
            let priceChart; // Declare chart variable globally or in a scope accessible by updateChart

            // Populate the dropdown
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All Products';
            productFilter.appendChild(allOption);

            products.forEach((product, index) => {
                const option = document.createElement('option');
                option.value = product;
                option.textContent = product;
                productFilter.appendChild(option);
                if (index === 0) { // Select the first product by default
                    option.selected = true;
                }
            });

            // Function to update the chart based on selected product
            function updateChart(selectedProduct = 'all') {
                const filteredData = selectedProduct === 'all' ? data : data.filter(item => item.product === selectedProduct);

                const currentProducts = [...new Set(filteredData.map(item => item.product))];
                const datasets = currentProducts.map(product => {
                    const productData = filteredData.filter(item => item.product === product)
                        .filter(item => isValidPrice(item.price));
                    return {
                        label: product,
                        data: productData.map(item => ({
                            x: luxon.DateTime.fromSQL(item.date).valueOf(),
                            y: parseFloat(item.price)
                        })),
                        borderColor: getRandomColor(),
                        fill: false
                    };
                });

                // Calculate min/max for Y-axis
                const validPrices = filteredData.map(item => parseFloat(item.price)).filter(price => !isNaN(price) && price.toString().length <= 10);
                let minPrice = 0;
                let maxPrice = 1;

                if (validPrices.length > 0) {
                    minPrice = Math.min(...validPrices);
                    maxPrice = Math.max(...validPrices);
                }

                // Add a buffer for better visualization
                let priceBuffer = (maxPrice - minPrice) * 0.1; // 10% buffer

                // Handle cases where minPrice and maxPrice are the same (constant price)
                if (minPrice === maxPrice) {
                    if (minPrice === 0) { // If price is 0, use a small positive buffer
                        priceBuffer = 0.1;
                    } else { // For non-zero constant prices, use a fixed buffer
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
                            stepSize: 7,
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
                    priceChart.options = chartOptions; // Update options
                    priceChart.update();
                } else {
                    const ctx = document.getElementById('priceChart').getContext('2d');
                    priceChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            datasets: datasets
                        },
                        options: chartOptions // Include options here
                    });
                }
            }

            // Initial chart load: default to the first product
            const initialProduct = productFilter.value;
            updateChart(initialProduct);

            // Add event listener for dropdown change
            productFilter.addEventListener('change', (event) => {
                updateChart(event.target.value);
            });

            function getRandomColor() {
                const letters = '0123456789ABCDEF';
                let color = '#';
                for (let i = 0; i < 6; i++) {
                    color += letters[Math.floor(Math.random() * 16)];
                }
                return color;
            }
        })
        .catch(error => {
            console.error('Error fetching or parsing CSV:', error);
        });
});
