var DoYouEvenLift = {
  init: function() {
    this.table = document.getElementById('weight-table');
    this.button = document.getElementById('add-column');

    this.button.addEventListener('click', this.addColumn.bind(this));
  },

  renderPercentagesColumn : function() {
    var row,
        cell,
        contents,
        i;

    for (i = 100; i > 0; i -= 5) {
      row = document.createElement('tr');
      cell = document.createElement('td');
      contents = document.createTextNode(i + '%');
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

  calculateColumn: function(columnIndex, event) {
    var input = event.target,
        rows = this.table.getElementsByTagName('tr'),
        i,
        contents,
        percent,
        weight = parseInt(input.value, 10),
        cell;

    for (i = 1; i < rows.length; i++) {
      percent = parseInt(rows[i].getElementsByTagName('td')[0].innerText, 10);
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
  DoYouEvenLift.renderPercentagesColumn();
};