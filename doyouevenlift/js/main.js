var DoYouEvenLift = {
  init: function() {
    this.table = document.getElementById('weight-table');
    this.button = document.getElementById('add-column');

    this.button.addEventListener('click', this.addColumn.bind(this));

    this.renderStaticColumns();
  },

  renderStaticColumns : function() {
    var row,
        cell,
        button,
        contents,
        i,
        percent;

    for (i = 0; i < 20; i++) {
      row = document.createElement('tr');
      cell = document.createElement('td');
      percent = (100 - (5 * i));

      if (i > 0) {
        button = document.createElement('button');
        button.appendChild(document.createTextNode('-'));
        button.setAttribute('class', 'remove-row');
        button.addEventListener('click', this.removeRow.bind(this, percent));
        cell.appendChild(button);
      }

      row.appendChild(cell);
      cell = document.createElement('td');
      contents = document.createTextNode(percent+ '%');
      cell.appendChild(contents);
      row.appendChild(cell);

      this.table.appendChild(row);
    }
  },

  addColumn: function() {
    var rows = this.table.getElementsByTagName('tr'),
        columnIndex = rows[0].getElementsByTagName('td').length,
        cell,
        input,
        i;

    for (i = 0; i < rows.length; i++) {
      cell = document.createElement('td');

      if (i === 0) {
        input = document.createElement('input');
        input.addEventListener('keyup', this.calculateColumn.bind(this, columnIndex));

        cell.appendChild(input);
      }

      rows[i].appendChild(cell);
    }

    input.focus();
  },

  removeRow: function(percent) {
    var rows = this.table.getElementsByTagName('tr'),
        rowPercent,
        i;

    for (i = 0; i < rows.length; i++) {
      rowPercent = parseInt(rows[i].getElementsByTagName('td')[1].innerText, 10);

      if (percent == rowPercent) {
        this.table.removeChild(rows[i]);
        break;
      }
    }
  },

  calculateColumn: function(columnIndex, event) {
    var input = event.target,
        rows = this.table.getElementsByTagName('tr'),
        i,
        contents,
        percent,
        weight = parseInt(input.value, 10),
        cell;

    for (i = 1; i < rows.length; i++) {
      percent = parseInt(rows[i].getElementsByTagName('td')[1].innerText, 10);
      contents = document.createTextNode(weight * percent / 100);

      cell = rows[i].getElementsByTagName('td')[columnIndex];

      while (cell.firstChild) {
        cell.removeChild(cell.firstChild);
      }

      rows[i].getElementsByTagName('td')[columnIndex].appendChild(contents);
    }
  }
};

window.onload = function() {
  DoYouEvenLift.init();
};