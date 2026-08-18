/* =========================================================
   WAYMARK — Internationalization (i18n)
   Greek (el) / English (en)
   ========================================================= */

(function () {
  'use strict';

  const translations = {
    el: {
      'app.title': 'Waymark',
      'app.modules': 'Λειτουργίες',
      'app.layers': 'Στρώματα',

      'module.nominatim': 'Αναζήτηση',
      'module.poi_viewer': 'Προβολή POIs',
      'module.osm_editor': 'OSM Editor',
      'module.track_recorder': 'Καταγραφή Διαδρομής',
      'module.building_editor': 'Σχεδιασμός Κτηρίων',
      'module.road_editor': 'Σχεδιασμός Δρόμων',
      'module.address_mapper': 'Καταγραφή Διευθύνσεων',
      'module.quest_mode': 'Quest Mode',
      'module.gpx_editor': 'GPX Editor',
      'module.xml_generator': 'XML Generator',
      'module.quality_checker': 'Quality Checker',
      'module.heatmap': 'Heatmap',
      'module.tags_lookup': 'Tags Lookup',
      'module.notes_browser': 'Notes Browser',
      'module.tutorial': 'Βοήθεια',

      'common.download': 'Κατέβασμα',
      'common.clear': 'Καθαρισμός',
      'common.error': 'Σφάλμα',
      'common.no_results': 'Δεν βρέθηκαν αποτελέσματα',
      'common.search': 'Αναζήτηση',
      'common.loading': 'Φόρτωση...',
      'common.save': 'Αποθήκευση',
      'common.cancel': 'Άκυρο',
      'common.close': 'Κλείσιμο',

      'osm.login': 'Σύνδεση με OSM',
      'osm.logged_in_as': 'Συνδεδεμένος',
      'osm.not_logged_in': 'Δεν είσαι συνδεδεμένος',
      'osm.changeset_comment': 'Σχόλιο changeset',
      'osm.upload': '📤 Ανέβασμα στο OSM',
      'osm.upload_success': 'Ανέβηκε επιτυχώς!',
      'osm.upload_failed': 'Το ανέβασμα απέτυχε',
      'osm.no_points': 'Δεν υπάρχουν σημεία στον χάρτη',
      'osm.download_osc': 'Κατέβασμα OSC',
      'osm.config_warning': 'Ρύθμισε το OSM_CLIENT_ID στο config.js',
    },

    en: {
      'app.title': 'Waymark',
      'app.modules': 'Modules',
      'app.layers': 'Layers',

      'module.nominatim': 'Search',
      'module.poi_viewer': 'POI Viewer',
      'module.osm_editor': 'OSM Editor',
      'module.track_recorder': 'Track Recorder',
      'module.building_editor': 'Building Editor',
      'module.road_editor': 'Road Editor',
      'module.address_mapper': 'Address Mapper',
      'module.quest_mode': 'Quest Mode',
      'module.gpx_editor': 'GPX Editor',
      'module.xml_generator': 'XML Generator',
      'module.quality_checker': 'Quality Checker',
      'module.heatmap': 'Heatmap',
      'module.tags_lookup': 'Tags Lookup',
      'module.notes_browser': 'Notes Browser',
      'module.tutorial': 'Help',

      'common.download': 'Download',
      'common.clear': 'Clear',
      'common.error': 'Error',
      'common.no_results': 'No results found',
      'common.search': 'Search',
      'common.loading': 'Loading...',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.close': 'Close',

      'osm.login': 'Login with OSM',
      'osm.logged_in_as': 'Logged in',
      'osm.not_logged_in': 'Not logged in',
      'osm.changeset_comment': 'Changeset comment',
      'osm.upload': '📤 Upload to OSM',
      'osm.upload_success': 'Uploaded successfully!',
      'osm.upload_failed': 'Upload failed',
      'osm.no_points': 'No points on map',
      'osm.download_osc': 'Download OSC',
      'osm.config_warning': 'Set OSM_CLIENT_ID in config.js',
    }
  };

  let currentLang = 'en';

  function detectLanguage() {
    const stored = localStorage.getItem('waymark_lang');
    if (stored && (stored === 'el' || stored === 'en')) return stored;

    const browser = (navigator.language || 'en').toLowerCase();
    if (browser.startsWith('el')) return 'el';
    return 'en';
  }

  currentLang = detectLanguage();

  function t(key) {
    const dict = translations[currentLang] || translations.en;
    return dict[key] || translations.en[key] || key;
  }

  function getCurrentLang() {
    return currentLang;
  }

  function setLanguage(lang) {
    if (lang === 'el' || lang === 'en') {
      currentLang = lang;
      localStorage.setItem('waymark_lang', lang);
      window.location.reload();
    }
  }

  // Expose globally — including getLanguage alias for app.js compatibility
  window.t = t;
  window.getCurrentLang = getCurrentLang;
  window.getLanguage = getCurrentLang;
  window.setLanguage = setLanguage;

})();