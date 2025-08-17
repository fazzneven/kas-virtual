// Kas Virtual - Complete JavaScript Application

// Initialize the application
class KasVirtual {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('kasVirtualTransactions')) || [];
        this.categories = {
            income: ['Kas', 'Bonus', 'Belanja', 'Penjualan', 'Lainnya'],
            expense: ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya']
        };
        this.init();
    }

    init() {
        this.setupTheme();
        this.setupEventListeners();
        this.loadCategories();
        this.renderTransactions();
        this.updateDashboard();
        this.setupCharts();
    }

    // Theme management
    setupTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('theme') || 'light';
        
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        }

        themeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
        });
    }

    // Event listeners
    setupEventListeners() {
        document.getElementById('transactionForm').addEventListener('submit', (e) => this.handleTransactionSubmit(e));
        document.getElementById('transactionType').addEventListener('change', () => this.loadCategories());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAllData());
    }

    // Load categories based on transaction type
    loadCategories() {
        const type = document.getElementById('transactionType').value;
        const categorySelect = document.getElementById('category');
        const categories = this.categories[type];
        
        categorySelect.innerHTML = '';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }

    // Handle transaction form submission
    handleTransactionSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const transaction = {
            id: Date.now(),
            type: document.getElementById('transactionType').value,
            category: document.getElementById('category').value,
            amount: parseFloat(document.getElementById('amount').value),
            description: document.getElementById('description').value,
            date: document.getElementById('date').value || new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        };

        if (!transaction.amount || transaction.amount <= 0) {
            this.showNotification('Masukkan jumlah yang valid', 'error');
            return;
        }

        this.transactions.unshift(transaction);
        this.saveTransactions();
        this.renderTransactions();
        this.updateDashboard();
        this.updateCharts();
        this.resetForm();
        this.showNotification('Transaksi berhasil ditambahkan!', 'success');
    }

    // Save transactions to localStorage
    saveTransactions() {
        localStorage.setItem('kasVirtualTransactions', JSON.stringify(this.transactions));
    }

    // Render transactions list
    renderTransactions() {
        const tbody = document.getElementById('transactionList');
        tbody.innerHTML = '';

        if (this.transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-8 text-gray-500 dark:text-gray-400">
                        <i class="fas fa-inbox text-4xl mb-2 opacity-50"></i>
                        <p>Belum ada transaksi</p>
                    </td>
                </tr>
            `;
            return;
        }

        this.transactions.slice(0, 10).forEach(transaction => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            
            const amountClass = transaction.type === 'income' ? 'text-green-600' : 'text-red-600';
            const amountPrefix = transaction.type === 'income' ? '+' : '-';
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">${this.formatDate(transaction.date)}</td>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">${transaction.description}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="badge-${transaction.type}">${transaction.category}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${amountClass}">
                    ${amountPrefix} Rp ${this.formatNumber(transaction.amount)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="kasVirtual.deleteTransaction(${transaction.id})" 
                            class="text-red-600 hover:text-red-900 dark:hover:text-red-400 transition">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Update dashboard statistics
    updateDashboard() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const monthlyTransactions = this.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear;
        });

        const totalIncome = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalBalance = this.transactions
            .reduce((sum, t) => {
                return t.type === 'income' ? sum + t.amount : sum - t.amount;
            }, 0);

        document.getElementById('totalIncome').textContent = `Rp ${this.formatNumber(totalIncome)}`;
        document.getElementById('totalExpense').textContent = `Rp ${this.formatNumber(totalExpense)}`;
        document.getElementById('totalBalance').textContent = `Rp ${this.formatNumber(totalBalance)}`;
        document.getElementById('totalTransactions').textContent = this.transactions.length;
    }

    // Setup charts
    setupCharts() {
        this.financeChart = null;
        this.categoryChart = null;
        this.currentCategoryType = 'expense';
        
        this.createFinanceChart();
        this.createCategoryChart();
        this.setupChartEventListeners();
    }

    // Setup chart event listeners
    setupChartEventListeners() {
        document.getElementById('financeTimeRange').addEventListener('change', () => this.updateFinanceChart());
        document.getElementById('categoryToggleIncome').addEventListener('click', () => this.toggleCategoryType('income'));
        document.getElementById('categoryToggleExpense').addEventListener('click', () => this.toggleCategoryType('expense'));
    }

    // Create finance trend chart
    createFinanceChart() {
        const ctx = document.getElementById('financeChart').getContext('2d');
        const timeRange = parseInt(document.getElementById('financeTimeRange').value);
        
        // Get data for selected time range
        const chartData = this.getFinanceChartData(timeRange);
        
        // Show/hide empty state
        const hasData = chartData.income.some(v => v > 0) || chartData.expense.some(v => v > 0);
        document.getElementById('financeEmptyState').classList.toggle('hidden', hasData);
        
        if (this.financeChart) {
            this.financeChart.destroy();
        }

        if (!hasData) {
            return;
        }

        const textColor = document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151';
        const gridColor = document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb';

        this.financeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Pemasukan',
                    data: chartData.income,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }, {
                    label: 'Pengeluaran',
                    data: chartData.expense,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: textColor,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': Rp ' + context.parsed.y.toLocaleString('id-ID');
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            callback: function(value) {
                                return 'Rp ' + value.toLocaleString('id-ID');
                            }
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    x: {
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    }
                }
            }
        });
    }

    // Get finance chart data based on time range
    getFinanceChartData(days) {
        const labels = [];
        const income = [];
        const expense = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Format label based on days range
            if (days <= 7) {
                labels.push(this.formatDate(dateStr));
            } else if (days <= 30) {
                labels.push(date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }));
            } else {
                labels.push(date.toLocaleDateString('id-ID', { month: 'short', day: '2-digit' }));
            }
            
            const dayTransactions = this.transactions.filter(t => t.date === dateStr);
            const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            
            income.push(dayIncome);
            expense.push(dayExpense);
        }
        
        return { labels, income, expense };
    }

    // Create category chart
    createCategoryChart() {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        
        const categoryData = this.getCategoryChartData(this.currentCategoryType);
        
        // Show/hide empty state
        const hasData = Object.keys(categoryData).length > 0;
        document.getElementById('categoryEmptyState').classList.toggle('hidden', hasData);
        document.getElementById('categoryEmptyMessage').textContent = 
            this.currentCategoryType === 'income' ? 'Belum ada data pemasukan' : 'Belum ada data pengeluaran';
        
        // Update toggle buttons
        document.getElementById('categoryToggleIncome').classList.toggle('bg-green-200', this.currentCategoryType === 'income');
        document.getElementById('categoryToggleIncome').classList.toggle('dark:bg-green-800', this.currentCategoryType === 'income');
        document.getElementById('categoryToggleExpense').classList.toggle('bg-red-200', this.currentCategoryType === 'expense');
        document.getElementById('categoryToggleExpense').classList.toggle('dark:bg-red-800', this.currentCategoryType === 'expense');

        if (this.categoryChart) {
            this.categoryChart.destroy();
        }

        if (!hasData) {
            return;
        }

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);
        const total = data.reduce((sum, val) => sum + val, 0);

        const textColor = document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151';
        
        // Generate colors based on type
        const colors = this.currentCategoryType === 'income' 
            ? ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5']
            : ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'];

        this.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            font: {
                                size: 11
                            },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return {
                                            text: `${label} (${percentage}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return context.label + ': Rp ' + value.toLocaleString('id-ID') + ' (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });
    }

    // Get category chart data
    getCategoryChartData(type) {
        const categoryData = {};
        this.transactions
            .filter(t => t.type === type)
            .forEach(t => {
                categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
            });
        return categoryData;
    }

    // Toggle category type
    toggleCategoryType(type) {
        this.currentCategoryType = type;
        this.createCategoryChart();
    }

    // Update finance chart
    updateFinanceChart() {
        this.createFinanceChart();
    }

    // Update charts
    updateCharts() {
        this.createFinanceChart();
        this.createCategoryChart();
    }

    // Delete transaction
    deleteTransaction(id) {
        Swal.fire({
            title: 'Hapus Transaksi?',
            text: "Transaksi ini akan dihapus secara permanen!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                this.transactions = this.transactions.filter(t => t.id !== id);
                this.saveTransactions();
                this.renderTransactions();
                this.updateDashboard();
                this.updateCharts();
                this.showNotification('Transaksi berhasil dihapus!', 'success');
            }
        });
    }

    // Export data
    exportData() {
        const data = {
            transactions: this.transactions,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kas-virtual-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Data berhasil diexport!', 'success');
    }

    // Clear all data
    clearAllData() {
        Swal.fire({
            title: 'Hapus Semua Data?',
            text: "Semua transaksi akan dihapus secara permanen!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Hapus Semua!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                this.transactions = [];
                this.saveTransactions();
                this.renderTransactions();
                this.updateDashboard();
                this.updateCharts();
                this.showNotification('Semua data berhasil dihapus!', 'success');
            }
        });
    }

    // Reset form
    resetForm() {
        document.getElementById('transactionForm').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    }

    // Utility functions
    formatNumber(num) {
        return num.toLocaleString('id-ID');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    showNotification(message, type = 'info') {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: type,
            title: message,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    }
}

// Initialize the application
const kasVirtual = new KasVirtual();

// Set default date
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
});
