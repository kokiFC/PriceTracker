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
    function updateChart(selectedProduct) {
        let filteredData = data;
        if (selectedProduct !== 'all') {
            filteredData = data.filter(item => item.product === selectedProduct);
        }

        const currentProducts = [...new Set(filteredData.map(item => item.product))];
        const datasets = currentProducts.map(product => {
            const productData = filteredData.filter(item => item.product === product);
            return {
                label: product,
                data: productData.map(item => ({
                    x: new Date(item.date),
                    y: parseFloat(item.price)
                })),
                borderColor: getRandomColor(),
                fill: false
            };
        });

        // Calculate min/max for Y-axis
        const allPrices = filteredData.map(item => parseFloat(item.price));
        const minPrice = Math.min(...allPrices);
        let maxPrice = Math.max(...allPrices);

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
                    time: {
                        unit: 'minute',
                        tooltipFormat: 'MMM D, YYYY HH:mm',
                        displayFormats: {
                            minute: 'HH:mm'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
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
                options: chartOptions
            });
        }
    }

    // Initial chart load: default to the first product if available, otherwise 'all'
    if (products.length > 0) {
        updateChart(products[0]);
    } else {
        updateChart('all');
    }

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
