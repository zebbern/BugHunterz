// ExportThisCookie/js/download.js

var saveText = function(text, filename) {
  var a = document.createElement('a');
  a.href = 'data:text/plain,' + encodeURIComponent(text);
  a.download = filename;
  var evt = document.createEvent('MouseEvents');
  evt.initMouseEvent(
    'click',
    true,
    true,
    window,
    0,
    0,
    0,
    0,
    0,
    false,
    true,
    false,
    false,
    0,
    null
  );
  a.dispatchEvent(evt);
};
