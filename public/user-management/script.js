let usersData = [];
let filteredData = [];

document.addEventListener('DOMContentLoaded', function() {
    const jsonFileInput = document.getElementById('jsonFile');
    const loadBtn = document.getElementById('loadBtn');
    const controls = document.getElementById('controls');
    const tableSection = document.getElementById('tableSection');
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const premiumFilter = document.getElementById('premiumFilter');
    const roleFilter = document.getElementById('roleFilter');
    const exportBtn = document.getElementById('exportUpdated');
    const noData = document.getElementById('noData');

    // Enable load button when file is selected
    jsonFileInput.addEventListener('change', function() {
        loadBtn.disabled = !this.files.length;
    });

    // Load JSON file
    loadBtn.addEventListener('click', function() {
        const file = jsonFileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                usersData = JSON.parse(e.target.result);
                filteredData = [...usersData];
                controls.style.display = 'block';
                tableSection.style.display = 'block';
                renderTable();
            } catch (error) {
                alert('Error al cargar el archivo JSON. Asegúrate de que sea un archivo válido.');
                console.error(error);
            }
        };
        reader.readAsText(file);
    });

    // Search functionality
    searchInput.addEventListener('input', filterData);
    premiumFilter.addEventListener('change', filterData);
    roleFilter.addEventListener('change', filterData);

    // Column toggle functionality
    document.querySelectorAll('.column-toggle input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const column = this.dataset.column;
            const headers = document.querySelectorAll(`th[data-column="${column}"]`);
            const cells = document.querySelectorAll(`td[data-column="${column}"]`);

            headers.forEach(header => header.style.display = this.checked ? '' : 'none');
            cells.forEach(cell => cell.style.display = this.checked ? '' : 'none');
        });
    });

    // Export updated JSON
    exportBtn.addEventListener('click', function() {
        const jsonBlob = new Blob([JSON.stringify(usersData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(jsonBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `usuarios_actualizados_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    function filterData() {
        const searchTerm = searchInput.value.toLowerCase();
        const premiumValue = premiumFilter.value;
        const roleValue = roleFilter.value;

        filteredData = usersData.filter(user => {
            const matchesSearch = user.name.toLowerCase().includes(searchTerm) ||
                                user.email.toLowerCase().includes(searchTerm);
            const matchesPremium = premiumValue === '' ||
                                 (premiumValue === 'true' && user.premiumActive) ||
                                 (premiumValue === 'false' && !user.premiumActive);
            const matchesRole = roleValue === '' || user.role === roleValue;

            return matchesSearch && matchesPremium && matchesRole;
        });

        renderTable();
    }

    function renderTable() {
        tableBody.innerHTML = '';

        if (filteredData.length === 0) {
            noData.style.display = 'block';
            return;
        }

        noData.style.display = 'none';

        filteredData.forEach(user => {
            const row = document.createElement('tr');

            // Helper function to create editable cell
            const createEditableCell = (value, field) => {
                const cell = document.createElement('td');
                cell.setAttribute('data-column', field);
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'editable';
                input.value = value || '';
                input.addEventListener('change', function() {
                    user[field] = this.value;
                });
                cell.appendChild(input);
                return cell;
            };

            // Helper function to create read-only cell
            const createCell = (value, field) => {
                const cell = document.createElement('td');
                cell.setAttribute('data-column', field);
                cell.textContent = value || '';
                return cell;
            };

            row.appendChild(createCell(user.name, 'name'));
            row.appendChild(createCell(user.email, 'email'));
            row.appendChild(createCell(user.phone, 'phone'));
            row.appendChild(createCell(user.examType, 'examType'));
            row.appendChild(createCell(user.premiumActive ? 'Sí' : 'No', 'premiumActive'));
            row.appendChild(createCell(getPremiumPlanText(user.premiumPlan), 'premiumPlan'));
            row.appendChild(createCell(user.examsTakenThisPeriod, 'examsTakenThisPeriod'));
            row.appendChild(createCell(user.quizzesCompleted, 'quizzesCompleted'));
            row.appendChild(createCell(getRoleText(user.role), 'role'));
            row.appendChild(createCell(user.isBanned ? 'Sí' : 'No', 'isBanned'));
            row.appendChild(createEditableCell(user.followUpCall, 'followUpCall'));
            row.appendChild(createEditableCell(user.followUpMessage, 'followUpMessage'));
            row.appendChild(createEditableCell(user.comments, 'comments'));
            row.appendChild(createEditableCell(user.result, 'result'));

            tableBody.appendChild(row);
        });
    }

    function getPremiumPlanText(plan) {
        const plans = {
            '10-day': '10 Días (1 Examen)',
            '30-day': '30 Días (3 Exámenes)',
            '60-day': '60 Días (6 Exámenes)',
            'permanent': 'Permanente',
            'trial': 'Prueba',
            'custom': 'Personalizado'
        };
        return plans[plan] || 'Sin Plan';
    }

    function getRoleText(role) {
        const roles = {
            'admin': 'Administrador',
            'supervisor_support': 'Supervisor Soporte',
            'support': 'Soporte',
            'normal': 'Normal'
        };
        return roles[role] || 'Normal';
    }
});
