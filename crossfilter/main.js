var httpRequest = new XMLHttpRequest(),
    names,
    data,
    cf,
    dimensions = {},
    groups = [],
    N = 100;

$.get('/sales.50k.csv', function (response) {
    names = response.split('\n')[0].split(',');
    data = csvToJson(response);

    loadCrossfilter();
    setupFilterButtons();

    createTables([
        {
            head: names,
            body: dimensions['date'].top(N)
        }
    ]);
});

function csvToJson(csv) {
    var lines = csv.split('\n');

    lines.shift();
    lines.pop();

    return lines.map(function (line) {
        return line.split(',').reduce(function (obj, value, i) {
            if (names[i] === 'date') {
                obj[names[i]] = new Date(value + ' 00:00');
            } else if (names[i] === 'amount' || names[i] === 'bonus' || names[i] === 'lat' || names[i] === 'lng') {
                obj[names[i]] = parseFloat(value, 10);
            } else if (names[i] === 'quarter') {
                obj[names[i]] = parseInt(value, 10);
            } else {
                obj[names[i]] = value;
            }

            return obj;
        }, {});
    });
}

function loadCrossfilter() {
    console.time('load crossfilter');
    cf = crossfilter(data);
    console.timeEnd('load crossfilter');

    createDimensions();
}

function createTables(specs) {
    $('table').remove();

    specs.forEach(function (spec) {
        var table = $('<table>');

        table.addClass('table');

        buildTableHeader(table, spec.head);
        populateTable(table, spec.body);

        $('#table-container').append(table);
    });
}

function buildTableHeader(el, names) {
    var thead = $('<thead>'),
        tr = $('<tr>');

    el.append(thead);
    thead.append(tr);

    names.forEach(function (name) {
        tr.append($('<th>').html(name));
    });
}

function createDimensions() {
    console.time('setup dimensions');
    dimensions['date'] = cf.dimension(function(d) { return d.date.getTime(); });
    dimensions['quarter'] = cf.dimension(function(d) { return d.quarter; });
    dimensions['salesperson'] = cf.dimension(function(d) { return d.salesperson; });
    dimensions['region'] = cf.dimension(function(d) { return d.region; });
    dimensions['company'] = cf.dimension(function(d) { return d.company; });
    dimensions['salesperson/region'] = cf.dimension(function (d) { return JSON.stringify({ salesperson: d['salesperson'], region: d['region'] })});
    console.timeEnd('setup dimensions');
}

function populateTable(el, rows) {
    var tbody = $('<tbodY>');

    el.append(tbody);

    rows.forEach(function (row) {
        var tr = $('<tr>');

        tbody.append(tr);
        names.forEach(function (name) {
            if (row[name]) {
                if (name === 'date') {
                    tr.append($('<td>').html(row[name].toDateString()));
                } else {
                    tr.append($('<td>').html(row[name]));
                }
            }
        });
    });
}

function setupFilterButtons() {
    $('#filter1').click(function () {
        var group,
            allGroups,
            rowsA = [],
            rowsB = [];

        clearFilters();
        //loadCrossfilter();

        console.time('filter1');
        dimensions['quarter'].filterRange([1, 2]);
        dimensions['salesperson'].filterExact('evan');
        console.timeEnd('filter1');

        console.time('group1a');
        group = dimensions['region'].group().reduceSum(function(d) { return d.amount; });
        groups.push(group);
        rowsA = group.all().map(function (group) {
            return {
                'region' : group.key,
                'amount' : group.value
            }
        });
        console.timeEnd('group1a');

        console.time('group1b');
        group = dimensions['company'].group().reduceSum(function(d) { return d.amount; });
        groups.push(group);
        rowsB = group.all().map(function (group) {
            return {
                'company' : group.key,
                'amount' : group.value
            }
        });
        console.timeEnd('group1b');

        createTables([
            {
                head: Object.keys(rowsA[0]),
                body: rowsA
            }, {
                head: Object.keys(rowsB[0]),
                body: rowsB
            }
        ]);
    });

    $('#filter2').click(function () {
        var group,
            rows = [];

        clearFilters();
        //loadCrossfilter();

        console.time('filter2');
        dimensions['date'].filterRange([ (new Date('mar 29, 2014 00:00')).getTime(), (new Date('april 2, 2014 00:00')).getTime() ]);
        console.timeEnd('filter2');

        console.time('group2');
        group = dimensions['salesperson/region'].group().reduceSum(function(d) { return d.bonus; });
        groups.push(group);
        rows = group.all().map(function (group) {
            var key = JSON.parse(group.key);

            return {
                'salesperson' : key['salesperson'],
                'region' : key['region'],
                'bonus' : group.value
            }
        });
        console.timeEnd('group2');

        createTables([
            {
                head: Object.keys(rows[0]),
                body: rows
            }
        ]);
    });

    $('#filter3').click(function () {
        clearFilters();
        //loadCrossfilter();

        createTables([
            {
                head: names,
                body: dimensions['date'].top(N)
            }
        ]);
    });
}

function clearFilters() {
    console.time('clear filters');
    groups.forEach(function (group) {
        group.dispose();
    });
    groups.length = 0;
    Object.keys(dimensions).forEach(function (name) {
        var dimension = dimensions[name];

        dimension.filterAll();
    });
    console.timeEnd('clear filters');
}
