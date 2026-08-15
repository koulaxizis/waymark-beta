/* =========================================================
   WAYMARK — i18n Internationalization
   Auto-detect browser language → fallback English
   No cookies. Preference in sessionStorage only.
   ========================================================= */

const TRANSLATIONS = {
  en: {
    'app.title': 'Waymark',
    'app.subtitle': 'OSM Mapping Toolkit',
    'status.online': 'Online',
    'status.offline': 'Offline',

    'layer.osm': 'Standard',
    'layer.dark': 'Dark',
    'layer.satellite': 'Satellite',
    'layer.topo': 'Topographic',

    'modules.title': 'Modules',
    'module.nominatim': 'Address Search',
    'module.poi_viewer': 'POI Viewer',
    'module.gpx_editor': 'GPX Editor',
    'module.xml_generator': 'XML Generator',
    'module.osm_editor': 'OSM Editor',
    'module.quality_checker': 'Quality Checker',
    'module.heatmap': 'Density Heatmap',
    'module.tags_lookup': 'Tags Reference',
    'module.notes_browser': 'Notes Browser',
    'module.tutorial': 'Tutorial Mode',

    'common.search': 'Search',
    'common.download': 'Download',
    'common.upload': 'Upload',
    'common.clear': 'Clear',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.finish': 'Finish',
    'common.loading': 'Loading...',
    'common.no_results': 'No results found',
    'common.error': 'An error occurred',

    'theme.toggle': 'Toggle theme',
    'lang.toggle': 'EN / EL',

    'footer.privacy': 'No Cookies • No Tracking • No Ads',
    'footer.source': 'Source Code',

    'osm.login': 'Login with OSM',
    'osm.logout': 'Logout',
    'osm.upload': 'Upload to OSM',
    'osm.download_osc': 'Download .osc file',
    'osm.not_logged_in': 'Not logged in',
    'osm.logged_in_as': 'Logged in',
    'osm.changeset_comment': 'Changeset comment',
    'osm.points_ready': 'Points ready',
    'osm.no_points': 'No points on the map',
    'osm.upload_success': 'Successfully uploaded!',
    'osm.upload_failed': 'Upload failed',
    'osm.config_warning': 'Please configure WAYMARK_CONFIG in config.js first.',

    'tutorial.welcome.title': 'Welcome to Waymark!',
    'tutorial.welcome.body': 'A privacy-first tool for exploring OpenStreetMap. Let\'s take a quick tour.',
    'tutorial.map.title': 'The Map',
    'tutorial.map.body': 'This is your workspace. Click anywhere to drop a pin and see coordinates. Drag to pan, scroll to zoom.',
    'tutorial.layers.title': 'Map Layers',
    'tutorial.layers.body': 'Switch between Standard, Dark, Satellite, and Topographic views. Tiles are cached for offline use.',
    'tutorial.modules.title': 'Modules',
    'tutorial.modules.body': 'Tools are OFF by default. Toggle any module on to activate it. Each module appears in the side panel.',
    'tutorial.search.title': 'Search Addresses',
    'tutorial.search.body': 'Enable the Address Search module to find any location worldwide using the Nominatim API.',
    'tutorial.poi.title': 'Find Points of Interest',
    'tutorial.poi.body': 'The POI Viewer lets you discover cafes, pharmacies, bus stops, and more in any area.',
    'tutorial.export.title': 'Export Your Work',
    'tutorial.export.body': 'Use the XML Generator or OSM Editor to export your data as .osc files, ready for upload to OpenStreetMap.',
    'tutorial.offline.title': 'Works Offline',
    'tutorial.offline.body': 'Waymark caches tiles automatically. Add it to your home screen for a native app experience.',
    'tutorial.privacy.title': 'Privacy First',
    'tutorial.privacy.body': 'No cookies, no tracking, no ads. All processing happens in your browser. Your data never leaves your device.',
    'tutorial.done.title': 'You\'re Ready!',
    'tutorial.done.body': 'Start exploring the map. Toggle modules as needed. Happy mapping!',

    'tutorial.skip': 'Skip tour',
    'tutorial.start': 'Start tutorial',
  },

  el: {
    'app.title': 'Waymark',
    'app.subtitle': 'Εργαλείο Χαρτογράφησης OSM',
    'status.online': 'Συνδεδεμένος',
    'status.offline': 'Εκτός σύνδεσης',

    'layer.osm': 'Κλασικό',
    'layer.dark': 'Σκοτεινό',
    'layer.satellite': 'Δορυφορικό',
    'layer.topo': 'Τοπογραφικό',

    'modules.title': 'Εργαλεία',
    'module.nominatim': 'Αναζήτηση Διεύθυνσης',
    'module.poi_viewer': 'Προβολή POI',
    'module.gpx_editor': 'Επεξεργασία GPX',
    'module.xml_generator': 'Δημιουργία XML',
    'module.osm_editor': 'Επεξεργασία OSM',
    'module.quality_checker': 'Έλεγχος Ποιότητας',
    'module.heatmap': 'Χάρτης Πυκνότητας',
    'module.tags_lookup': 'Αναφορά Tags',
    'module.notes_browser': 'Προβολή Σημειώσεων',
    'module.tutorial': 'Οδηγός Χρήσης',

    'common.search': 'Αναζήτηση',
    'common.download': 'Λήψη',
    'common.upload': 'Ανέβασμα',
    'common.clear': 'Καθαρισμός',
    'common.cancel': 'Άκυρο',
    'common.close': 'Κλείσιμο',
    'common.next': 'Επόμενο',
    'common.previous': 'Προηγούμενο',
    'common.finish': 'Ολοκλήρωση',
    'common.loading': 'Φόρτωση...',
    'common.no_results': 'Δεν βρέθηκαν αποτελέσματα',
    'common.error': 'Παρουσιάστηκε σφάλμα',

    'theme.toggle': 'Αλλαγή θέματος',
    'lang.toggle': 'EN / EL',

    'footer.privacy': 'Χωρίς Cookies • Χωρίς Παρακολούθηση • Χωρίς Διαφημίσεις',
    'footer.source': 'Πηγαίος Κώδικας',

    'osm.login': 'Σύνδεση με OSM',
    'osm.logout': 'Αποσύνδεση',
    'osm.upload': 'Ανέβασμα στο OSM',
    'osm.download_osc': 'Λήψη αρχείου .osc',
    'osm.not_logged_in': 'Δεν είσαι συνδεδεμένος',
    'osm.logged_in_as': 'Συνδεδεμένος',
    'osm.changeset_comment': 'Σχόλιο changeset',
    'osm.points_ready': 'Σημεία έτοιμα',
    'osm.no_points': 'Δεν υπάρχουν σημεία στον χάρτη',
    'osm.upload_success': 'Επιτυχές ανέβασμα!',
    'osm.upload_failed': 'Το ανέβασμα απέτυχε',
    'osm.config_warning': 'Παρακαλώ ρύθμισε το WAYMARK_CONFIG στο config.js πρώτα.',

    'tutorial.welcome.title': 'Καλωσήρθες στο Waymark!',
    'tutorial.welcome.body': 'Ένα εργαλείο χαρτογράφησης με απόλυτο σεβασμό στην ιδιωτικότητα. Ας δούμε μια γρήγορη περιήγηση.',
    'tutorial.map.title': 'Ο Χάρτης',
    'tutorial.map.body': 'Αυτός είναι ο χώρος εργασίας σου. Κάνε κλικ οπουδήποτε για να εμφανίσεις συντεταγμένες. Σύρε για μετακίνηση, σκρόλαρε για ζουμ.',
    'tutorial.layers.title': 'Στρώματα Χάρτη',
    'tutorial.layers.body': 'Εναλλαγή μεταξύ Κλασικού, Σκοτεινού, Δορυφορικού και Τοπογραφικού. Τα tiles αποθηκεύονται για χρήση offline.',
    'tutorial.modules.title': 'Εργαλεία',
    'tutorial.modules.body': 'Όλα τα εργαλεία είναι ΑΝΕΝΕΡΓΑ εξ ορισμού. Ενεργοποίησε όποιο χρειάζεσαι. Κάθε εργαλείο εμφανίζεται στο πλευρικό πάνελ.',
    'tutorial.search.title': 'Αναζήτηση Διευθύνσεων',
    'tutorial.search.body': 'Ενεργοποίησε την Αναζήτηση Διεύθυνσης για να βρεις οποιαδήποτε τοποθεσία παγκοσμίως μέσω Nominatim API.',
    'tutorial.poi.title': 'Εύρεση Σημείων Ενδιαφέροντος',
    'tutorial.poi.body': 'Η Προβολή POI σου επιτρέπει να ανακαλύψεις cafes, φαρμακεία, στάσεις λεωφορείων και άλλα σε κάθε περιοχή.',
    'tutorial.export.title': 'Εξαγωγή Δεδομένων',
    'tutorial.export.body': 'Χρησιμοποίησε το XML Generator ή το OSM Editor για να εξάγεις δεδομένα ως .osc αρχεία, έτοιμα για ανέβασμα στο OpenStreetMap.',
    'tutorial.offline.title': 'Λειτουργία Offline',
    'tutorial.offline.body': 'Το Waymark αποθηκεύει tiles αυτόματα. Πρόσθεσέ το στην αρχική οθόνη για εμπειρία native app.',
    'tutorial.privacy.title': 'Ιδιωτικότητα Πρώτα',
    'tutorial.privacy.body': 'Χωρίς cookies, χωρίς παρακολούθηση, χωρίς διαφημίσεις. Όλη η επεξεργασία γίνεται στον browser σου. Τα δεδομένα σου δεν φεύγουν ποτέ.',
    'tutorial.done.title': 'Είσαι Έτοιμος!',
    'tutorial.done.body': 'Ξεκίνα να εξερευνείς τον χάρτη. Ενεργοποίησε εργαλεία όπως χρειάζεσαι. Καλή χαρτογράφηση!',

    'tutorial.skip': 'Παράλειψη',
    'tutorial.start': 'Ξεκίνα οδηγό',
  }
};

function detectLanguage() {
  const saved = sessionStorage.getItem('waymark_lang');
  if (saved && TRANSLATIONS[saved]) return saved;
  const browserLang = navigator.language || navigator.userLanguage || '';
  if (browserLang.startsWith('el')) return 'el';
  return 'en';
}

let currentLang = detectLanguage();

function t(key) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
}

function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) return;
  currentLang = lang;
  sessionStorage.setItem('waymark_lang', lang);
  applyTranslations();
}

function toggleLanguage() {
  setLanguage(currentLang === 'en' ? 'el' : 'en');
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
  });
  document.documentElement.lang = currentLang;
}

window.t = t;
window.setLanguage = setLanguage;
window.toggleLanguage = toggleLanguage;
window.applyTranslations = applyTranslations;
window.getCurrentLang = () => currentLang;