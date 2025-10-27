   // Global variables
        let isLoading = false;
        let coinsData = [];
        let currentCoin = null;
        let priceChart = null;
        let portfolio = JSON.parse(localStorage.getItem('cryptoPortfolio') || '[]');

        // Utility functions
        function getUserPortfolio() {
            const user = localStorage.getItem('loggedInUser');
            if (!user) return [];
            return JSON.parse(localStorage.getItem('cryptoPortfolio_' + user) || '[]');
        }

        function saveUserPortfolio(portfolio) {
            const user = localStorage.getItem('loggedInUser');
            if (!user) return;
            localStorage.setItem('cryptoPortfolio_' + user, JSON.stringify(portfolio));
        }

        function formatNumber(num) {
            if (num === null || num === undefined) return 'N/A';

            if (num >= 1e12) {
                return (num / 1e12).toFixed(2) + 'T';
            } else if (num >= 1e9) {
                return (num / 1e9).toFixed(2) + 'B';
            } else if (num >= 1e6) {
                return (num / 1e6).toFixed(2) + 'M';
            } else if (num >= 1e3) {
                return (num / 1e3).toFixed(2) + 'K';
            } else {
                return num.toLocaleString();
            }
        }

        function formatPrice(price) {
            if (price === null || price === undefined) return 'N/A';

            if (price < 0.01) {
                return '€' + price.toFixed(6);
            } else if (price < 1) {
                return '€' + price.toFixed(4);
            } else {
                return '€' + price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }
        }

        function formatPercentage(percent) {
            if (percent === null || percent === undefined) return 'N/A';

            const className = percent >= 0 ? 'price-positive' : 'price-negative';
            const icon = percent >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

            return `<span class="${className}">
                        <i class="fas ${icon} me-1"></i>
                        ${Math.abs(percent).toFixed(2)}%
                    </span>`;
        }

        function showNotification(message, type = 'success') {
            const notification = $(`
                <div class="alert alert-${type} alert-dismissible fade show notification" role="alert">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `);

            $('#notificationContainer').append(notification);

            setTimeout(() => {
                notification.alert('close');
            }, 5000);
        }

        // API functions
        function fetchCoinData() {
            if (isLoading) return;

            isLoading = true;
            showLoading();
            hideError();

            const apiUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h';

            $.ajax({
                url: apiUrl,
                method: 'GET',
                timeout: 10000,
                success: function (data) {
                    coinsData = data;
                    displayCoins(data);
                    updateLastUpdated();
                    hideLoading();
                    showTable();
                    updatePortfolioValues();
                },
                error: function (xhr, status, error) {
                    console.error('API Error:', error);
                    showError('Failed to fetch cryptocurrency data. Please check your internet connection and try again.');
                    hideLoading();
                }
            }).always(function () {
                isLoading = false;
            });
        }

        function fetchCoinDetail(coinId) {
            showLoading();

            const apiUrl = `https://api.coingecko.com/api/v3/coins/${coinId}`;

            $.ajax({
                url: apiUrl,
                method: 'GET',
                timeout: 10000,
                success: function (data) {
                    currentCoin = data;
                    displayCoinDetail(data);
                    fetchPriceHistory(coinId);
                },
                error: function (xhr, status, error) {
                    console.error('API Error:', error);
                    showError('Failed to fetch coin details.');
                    hideLoading();
                }
            });
        }

        function fetchPriceHistory(coinId) {
            const apiUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=eur&days=7`;

            $.ajax({
                url: apiUrl,
                method: 'GET',
                timeout: 10000,
                success: function (data) {
                    displayPriceChart(data.prices);
                    hideLoading();
                },
                error: function (xhr, status, error) {
                    console.error('Chart API Error:', error);
                    hideLoading();
                }
            });
        }

        // Display functions
        function displayCoins(coins) {
            const tbody = $('#coinsTableBody');
            tbody.empty();

            coins.forEach(function (coin, index) {
                const row = `
                    <tr class="coin-row" data-coin-id="${coin.id}">
                        <td class="fw-bold">${index + 1}</td>
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="${coin.image}" alt="${coin.name}" class="coin-logo me-2" onerror="this.src='https://via.placeholder.com/30x30/cccccc/666666?text=${coin.symbol.charAt(0).toUpperCase()}'">
                                <div>
                                    <div class="fw-semibold">${coin.name}</div>
                                    <small class="text-muted text-uppercase">${coin.symbol}</small>
                                </div>
                            </div>
                        </td>
                        <td class="fw-semibold">${formatPrice(coin.current_price)}</td>
                        <td>${formatPercentage(coin.price_change_percentage_24h)}</td>
                        <td class="d-none d-md-table-cell market-cap">${formatNumber(coin.market_cap)}</td>
                        <td class="d-none d-lg-table-cell volume">${formatNumber(coin.total_volume)}</td>
                    </tr>
                `;
                tbody.append(row);
            });
        }

        function displayCoinDetail(coin) {
            const detail = `
                <div class="row align-items-center mb-4">
                    <div class="col-md-8">
                        <div class="d-flex align-items-center">
                            <img src="${coin.image.large}" alt="${coin.name}" class="coin-logo-large me-3">
                            <div>
                                <h2 class="mb-1">${coin.name}</h2>
                                <p class="text-muted text-uppercase mb-2">${coin.symbol}</p>
                                <div class="d-flex align-items-center">
                                    <h3 class="me-3 mb-0">${formatPrice(coin.market_data.current_price.usd)}</h3>
                                    <div>${formatPercentage(coin.market_data.price_change_percentage_24h)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 text-md-end mt-3 mt-md-0">
                        <button class="btn add-to-portfolio-btn text-white" data-coin-id="${coin.id}" data-coin-symbol="${coin.symbol.toUpperCase()}" data-current-price="${coin.market_data.current_price.usd}">
                            <i class="fas fa-plus me-2"></i>Add to Portfolio
                        </button>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-4">
                            <h5>Market Statistics</h5>
                            <table class="table table-borderless">
                                <tr>
                                    <td>Market Cap:</td>
                                    <td class="fw-semibold">${formatNumber(coin.market_data.market_cap.usd)}</td>
                                </tr>
                                <tr>
                                    <td>24h Volume:</td>
                                    <td class="fw-semibold">${formatNumber(coin.market_data.total_volume.usd)}</td>
                                </tr>
                                <tr>
                                    <td>Circulating Supply:</td>
                                    <td class="fw-semibold">${formatNumber(coin.market_data.circulating_supply)}</td>
                                </tr>
                                <tr>
                                    <td>Total Supply:</td>
                                    <td class="fw-semibold">${formatNumber(coin.market_data.total_supply)}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-4">
                            <h5>Price Changes</h5>
                            <table class="table table-borderless">
                                <tr>
                                    <td>1 Hour:</td>
                                    <td>${formatPercentage(coin.market_data.price_change_percentage_1h_in_currency.usd)}</td>
                                </tr>
                                <tr>
                                    <td>24 Hours:</td>
                                    <td>${formatPercentage(coin.market_data.price_change_percentage_24h)}</td>
                                </tr>
                                <tr>
                                    <td>7 Days:</td>
                                    <td>${formatPercentage(coin.market_data.price_change_percentage_7d)}</td>
                                </tr>
                                <tr>
                                    <td>30 Days:</td>
                                    <td>${formatPercentage(coin.market_data.price_change_percentage_30d)}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            $('#coinDetail').html(detail);
            $('#coinsListView').addClass('hidden');
            $('#coinDetailView').removeClass('hidden');
        }

        function displayPriceChart(priceData) {
            const ctx = document.getElementById('priceChart').getContext('2d');

            if (priceChart) {
                priceChart.destroy();
            }

            const labels = priceData.map(point => {
                const date = new Date(point[0]);
                return date.toLocaleDateString();
            });

            const prices = priceData.map(point => point[1]);

            priceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Price (USD)',
                        data: prices,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: false,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: false,
                            ticks: {
                                callback: function (value) {
                                    return '$' + value.toFixed(2);
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return 'Price: $' + context.parsed.y.toFixed(2);
                                }
                            }
                        }
                    }
                }
            });
        }

        function displayPortfolio() {
            const user = localStorage.getItem('loggedInUser');
            if (!user) {
                $('#portfolioList').html(`
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-lock fa-3x mb-3"></i>
                        <p>You must be logged in to view your portfolio.</p>
                    </div>
                `);
                $('#portfolioSummary').hide();
                return;
            }
            portfolio = getUserPortfolio();
            if (portfolio.length === 0) {
                $('#portfolioList').html(`
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-wallet fa-3x mb-3"></i>
                        <p>Your portfolio is empty. Add some coins to get started!</p>
                    </div>
                `);
                $('#portfolioSummary').show();
                updatePortfolioValues();
                return;
            }
            let html = '';
            portfolio.forEach((item, index) => {
                const currentCoin = coinsData.find(coin => coin.id === item.coinId);
                const currentPrice = currentCoin ? currentCoin.current_price : 0;
                const currentValue = item.amount * currentPrice;
                const profit = currentValue - (item.amount * item.purchasePrice);
                const profitPercent = ((currentPrice - item.purchasePrice) / item.purchasePrice) * 100;

                html += `
                    <div class="portfolio-item portfolio-card mb-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="d-flex align-items-center">
                                <img src="${currentCoin ? currentCoin.image : ''}" class="coin-logo me-3" alt="${item.coinSymbol}">
                                <div>
                                    <h6 class="mb-1">${item.coinSymbol}</h6>
                                    <small class="text-muted">${item.amount} coins</small>
                                </div>
                            </div>
                            <div class="text-end">
                                <div class="fw-semibold">${formatPrice(currentValue)}</div>
                                <div class="${profit >= 0 ? 'price-positive' : 'price-negative'}">
                                    ${profit >= 0 ? '+' : ''}${formatPrice(profit)} (${profitPercent.toFixed(2)}%)
                                </div>
                                <button class="btn btn-sm btn-outline-danger mt-1" onclick="removeFromPortfolio(${index})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            $('#portfolioList').html(html);
            $('#portfolioSummary').show();
        }

        function updatePortfolioValues() {
            if (portfolio.length === 0) {
                $('#totalValue').text('$0.00');
                $('#totalCoins').text('0');
                $('#totalChange').text('+0.00%').removeClass('price-negative').addClass('price-positive');
                return;
            }

            let totalValue = 0;
            let totalInvested = 0;

            portfolio.forEach(item => {
                const currentCoin = coinsData.find(coin => coin.id === item.coinId);
                if (currentCoin) {
                    totalValue += item.amount * currentCoin.current_price;
                    totalInvested += item.amount * item.purchasePrice;
                }
            });

            const totalChange = ((totalValue - totalInvested) / totalInvested) * 100;

            $('#totalValue').text(formatPrice(totalValue));
            $('#totalCoins').text(portfolio.length);
            $('#totalChange').text(`${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)}%`)
                .removeClass(totalChange >= 0 ? 'price-negative' : 'price-positive')
                .addClass(totalChange >= 0 ? 'price-positive' : 'price-negative');
        }

        function savePortfolio() {
            saveUserPortfolio(portfolio);
            displayPortfolio();
            updatePortfolioValues();
        }

        function removeFromPortfolio(index) {
            if (confirm('Are you sure you want to remove this coin from your portfolio?')) {
                portfolio.splice(index, 1);
                savePortfolio();
                showNotification('Coin removed from portfolio', 'success');
            }
        }

        // Display control functions
        function showLoading() {
            $('#loadingSpinner').show();
            $('#refreshBtn i').addClass('fa-spin');
        }

        function hideLoading() {
            $('#loadingSpinner').hide();
            $('#refreshBtn i').removeClass('fa-spin');
        }

        function showError(message) {
            $('#errorMessage').text(message);
            $('#errorAlert').removeClass('d-none');
        }

        function hideError() {
            $('#errorAlert').addClass('d-none');
        }

        function showTable() {
            $('#coinsTable').removeClass('d-none');
            $('#lastUpdated').removeClass('d-none');
        }

        function updateLastUpdated() {
            const now = new Date();
            const timeString = now.toLocaleTimeString();
            $('#updateTime').text(timeString);
        }

        function register() {
            const username = $('#username').val();
            const password = $('#password').val();

            if (!username || !password) {
                $('#message').text('Please fill in all fields.');
                return;
            }

            if (localStorage.getItem(username)) {
                $('#message').text('User already exists.');
            } else {
                localStorage.setItem(username, password);
                $('#message').text('Registered successfully!');
            }
        }

        function login() {
            const username = $('#username').val();
            const password = $('#password').val();
            const storedPassword = localStorage.getItem(username);

            if (!storedPassword) {
                $('#message').text('User not found.');
            } else if (storedPassword === password) {
                $('#message').text('Login successful!');
                localStorage.setItem('loggedInUser', username);
                $('#loginModal').modal('hide'); // close modal after login
                checkLogin(); // update UI or unlock portfolio
            } else {
                $('#message').text('Incorrect password.');
            }
        }

        function checkLogin() {
            const user = localStorage.getItem('loggedInUser');
            if (user) {
                $('#loginBtn').html(`<i class="fas fa-user-check me-2"></i>${user}`);
                $('#logoutBtn').removeClass('d-none');
            } else {
                $('#loginBtn').html('<i class="fas fa-user me-2"></i>Login');
                $('#logoutBtn').addClass('d-none');
            }
            displayPortfolio();
        }

        // Event handlers
        $(document).ready(function () {
            // Initial data fetch
            fetchCoinData();
            displayPortfolio();

            // Coin row click handler
            $(document).on('click', '.coin-row', function () {
                const coinId = $(this).data('coin-id');
                fetchCoinDetail(coinId);
            });

            // Back to list button
            $('#backToList').click(function () {
                $('#coinDetailView').addClass('hidden');
                $('#coinsListView').removeClass('hidden');
            });

            // Refresh button click
            $('#refreshBtn').click(function () {
                fetchCoinData();
            });

            // Portfolio toggle
            $('#portfolioToggle').click(function () {
                $('#portfolio-tab').tab('show');
            });

            // Add to portfolio button
            $(document).on('click', '.add-to-portfolio-btn', function () {
                const coinId = $(this).data('coin-id');
                const coinSymbol = $(this).data('coin-symbol');
                const currentPrice = $(this).data('current-price');

                $('#coinId').val(coinId);
                $('#coinSymbol').val(coinSymbol);
                $('#purchasePrice').val(currentPrice);
                $('#amount').val('');

                const modal = new bootstrap.Modal($('#addToPortfolioModal')[0]);
                modal.show();
            });

            // Save to portfolio
            $('#saveToPortfolio').click(function () {
                const user = localStorage.getItem('loggedInUser');
                if (!user) {
                    showNotification('You must be logged in to add to your portfolio', 'danger');
                    return;
                }
                const coinId = $('#coinId').val();
                const coinSymbol = $('#coinSymbol').val();
                const amount = parseFloat($('#amount').val());
                const purchasePrice = parseFloat($('#purchasePrice').val());

                if (!amount || !purchasePrice) {
                    showNotification('Please fill all required fields', 'danger');
                    return;
                }

                // Check if coin already exists in portfolio
                const existingIndex = portfolio.findIndex(item => item.coinId === coinId);

                if (existingIndex >= 0) {
                    // Update existing entry
                    const existing = portfolio[existingIndex];
                    const totalAmount = existing.amount + amount;
                    const avgPrice = ((existing.amount * existing.purchasePrice) + (amount * purchasePrice)) / totalAmount;

                    portfolio[existingIndex] = {
                        coinId: coinId,
                        coinSymbol: coinSymbol,
                        amount: totalAmount,
                        purchasePrice: avgPrice
                    };

                    showNotification(`Updated ${coinSymbol} in portfolio`, 'success');
                } else {
                    // Add new entry
                    portfolio.push({
                        coinId: coinId,
                        coinSymbol: coinSymbol,
                        amount: amount,
                        purchasePrice: purchasePrice
                    });

                    showNotification(`${coinSymbol} added to portfolio`, 'success');
                }

                savePortfolio();
                $('#addToPortfolioModal').modal('hide');
            });

            // When login button is clicked, show the modal
            $('#loginBtn').on('click', function () {
                const modal = new bootstrap.Modal($('#loginModal')[0]);
                modal.show();
            });

            $('#logoutBtn').on('click', function () {
                localStorage.removeItem('loggedInUser');
                checkLogin();
            });

            // Tab change handler
            $('#portfolio-tab').on('shown.bs.tab', function () {
                displayPortfolio();
                updatePortfolioValues();
            });

            // Auto-refresh every 60 seconds
            setInterval(function () {
                if (!isLoading && $('#market').hasClass('show')) {
                    fetchCoinData();
                }
            }, 60000);

            // Handle API rate limiting gracefully
            $(document).ajaxError(function (event, xhr, settings, thrownError) {
                if (xhr.status === 429) {
                    showError('API rate limit exceeded. Please wait a moment before refreshing.');
                }
            });
        });

        // Keyboard shortcuts
        $(document).keydown(function (e) {
            // Press 'R' to refresh
            if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                fetchCoinData();
            }

            // Press 'Escape' to go back to list
            if (e.key === 'Escape' && !$('#coinDetailView').hasClass('hidden')) {
                e.preventDefault();
                $('#backToList').click();
            }
        });


        checkLogin();
        // Make removeFromPortfolio globally accessible
        window.removeFromPortfolio = removeFromPortfolio;