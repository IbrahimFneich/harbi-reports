/* === src/js/ui/changelog.js === */

export function showChangelog() {
  var existing = document.querySelector('.changelog-overlay');
  if (existing) { existing.classList.add('show'); return; }

  fetch('changelog.json?t=' + Date.now())
    .then(function(r) { return r.json(); })
    .then(function(releases) {
      var overlay = document.createElement('div');
      overlay.className = 'changelog-overlay show';
      overlay.onclick = function(e) { if (e.target === overlay) overlay.classList.remove('show'); };

      var modal = document.createElement('div');
      modal.className = 'changelog-modal';

      var header = document.createElement('div');
      header.className = 'changelog-header';
      var h2 = document.createElement('h2');
      h2.textContent = 'Changelog';
      header.appendChild(h2);
      var closeBtn = document.createElement('button');
      closeBtn.className = 'changelog-close';
      closeBtn.textContent = '\u2715';
      closeBtn.onclick = function() { overlay.classList.remove('show'); };
      header.appendChild(closeBtn);
      modal.appendChild(header);

      var body = document.createElement('div');
      body.className = 'changelog-body';

      for (var i = 0; i < releases.length; i++) {
        var rel = releases[i];
        var release = document.createElement('div');
        release.className = 'changelog-release';

        var verRow = document.createElement('div');
        verRow.className = 'changelog-ver';

        var badge = document.createElement('span');
        badge.className = 'ver-badge';
        badge.textContent = 'v' + rel.version;
        verRow.appendChild(badge);

        var title = document.createElement('span');
        title.className = 'ver-title';
        title.textContent = rel.title;
        verRow.appendChild(title);

        var date = document.createElement('span');
        date.className = 'ver-date';
        date.textContent = rel.date;
        verRow.appendChild(date);

        release.appendChild(verRow);

        var list = document.createElement('ul');
        list.className = 'changelog-list';
        for (var j = 0; j < rel.changes.length; j++) {
          var li = document.createElement('li');
          li.textContent = rel.changes[j];
          list.appendChild(li);
        }
        release.appendChild(list);
        body.appendChild(release);
      }

      modal.appendChild(body);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    });
}
