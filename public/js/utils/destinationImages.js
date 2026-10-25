/**
 * Destination & Trip Image Resolver (Client-Side)
 * Ensures each trip displays its authentic destination image (e.g. Ooty -> Ooty, Goa -> Goa, Manali -> Manali)
 * and safely replaces broken images with destination-specific fallbacks without infinite loops.
 */
(function (global) {
  'use strict';

  // Generic placeholders that should be upgraded to destination-specific photos
  const GENERIC_PLACEHOLDER_IDS = [
    'photo-1488646953014-85cb44e25828', // Old generic suitcase/map photo
    'photo-1493976040374-85c8e12f0c0e', // Kyoto pagoda photo
    'photo-1599661046289-e31897846e41'  // Jaipur Hawa Mahal
  ];

  // Verified HTTPS destination photography catalog
  const DESTINATION_IMAGE_MAP = [
    {
      keys: ['ooty', 'udhagamandalam', 'nilgiri', 'coonoor', 'pykara', 'doddabetta'],
      url: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80',
      name: 'Ooty'
    },
    {
      keys: ['goa', 'panaji', 'calangute', 'baga', 'anjuna', 'vagator', 'candolim', 'palolem', 'colva'],
      url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
      name: 'Goa'
    },
    {
      keys: ['manali', 'solang', 'rohtang', 'kullu', 'old manali', 'jogini', 'atal tunnel'],
      url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
      name: 'Manali'
    },
    {
      keys: ['munnar', 'idukki', 'eravikulam', 'mattupetty', 'anamudi'],
      url: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=800&q=80',
      name: 'Munnar'
    },
    {
      keys: ['jaipur', 'pink city', 'amer fort', 'hawa mahal', 'nahargarh', 'chokhi dhani'],
      url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
      name: 'Jaipur'
    },
    {
      keys: ['udaipur', 'lake pichola', 'city palace', 'fateh sagar', 'jag mandir'],
      url: 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=800&q=80',
      name: 'Udaipur'
    },
    {
      keys: ['leh', 'ladakh', 'pangong', 'nubra', 'khardung', 'zanskar', 'spiti'],
      url: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=800&q=80',
      name: 'Leh Ladakh'
    },
    {
      keys: ['shimla', 'kufri', 'the ridge', 'viceregal', 'chail', 'mashobra'],
      url: 'https://images.unsplash.com/photo-1597074866923-dc0589150358?auto=format&fit=crop&w=800&q=80',
      name: 'Shimla'
    },
    {
      keys: ['kerala', 'alleppey', 'alappuzha', 'kochi', 'cochin', 'kumarakom', 'backwaters', 'vembanad'],
      url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80',
      name: 'Kerala'
    },
    {
      keys: ['varanasi', 'kashi', 'banaras', 'ganga aarti', 'dashashwamedh', 'assighat', 'sarnath'],
      url: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80',
      name: 'Varanasi'
    },
    {
      keys: ['rishikesh', 'haridwar', 'laxman jhula', 'ram jhula', 'triveni ghat', 'shivpuri'],
      url: 'https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=800&q=80',
      name: 'Rishikesh'
    },
    {
      keys: ['agra', 'taj mahal', 'fatehpur sikri'],
      url: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
      name: 'Agra'
    },
    {
      keys: ['hampi', 'badami', 'vijayanagara', 'tungabhadra', 'virupaksha'],
      url: 'https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?auto=format&fit=crop&w=800&q=80',
      name: 'Hampi'
    },
    {
      keys: ['coorg', 'kodagu', 'madikeri', 'abbey falls', 'raja seat'],
      url: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=800&q=80',
      name: 'Coorg'
    },
    {
      keys: ['kashmir', 'srinagar', 'gulmarg', 'pahalgam', 'dal lake', 'sonamarg'],
      url: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=800&q=80',
      name: 'Kashmir'
    },
    {
      keys: ['andaman', 'nicobar', 'havelock', 'radhanagar', 'port blair', 'neil island'],
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      name: 'Andaman'
    },
    {
      keys: ['pondicherry', 'puducherry', 'auroville', 'promenade beach', 'french quarter'],
      url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
      name: 'Pondicherry'
    },
    {
      keys: ['darjeeling', 'gangtok', 'sikkim', 'tiger hill', 'kanchenjunga'],
      url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
      name: 'Darjeeling'
    },
    {
      keys: ['sundarbans', 'delta', 'mangrove', 'royal bengal'],
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      name: 'Sundarbans'
    },
    {
      keys: ['amritsar', 'golden temple', 'wagah'],
      url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
      name: 'Amritsar'
    },
    {
      keys: ['mysore', 'mysuru', 'chamundi'],
      url: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
      name: 'Mysore'
    },
    {
      keys: ['kodaikanal', 'kodai', 'pillar rocks'],
      url: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80',
      name: 'Kodaikanal'
    },
    {
      keys: ['mussoorie', 'kempty falls', 'gun hill', 'landour'],
      url: 'https://images.unsplash.com/photo-1597074866923-dc0589150358?auto=format&fit=crop&w=800&q=80',
      name: 'Mussoorie'
    },
    {
      keys: ['gokarna', 'om beach', 'kudle beach'],
      url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
      name: 'Gokarna'
    },
    {
      keys: ['varkala', 'cliff beach', 'papanasam'],
      url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
      name: 'Varkala'
    },
    {
      keys: ['jodhpur', 'blue city', 'mehrangarh'],
      url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
      name: 'Jodhpur'
    },
    {
      keys: ['bangalore', 'bengaluru'],
      url: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80',
      name: 'Bangalore'
    },
    {
      keys: ['mumbai', 'bombay', 'marine drive', 'gateway of india'],
      url: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80',
      name: 'Mumbai'
    },
    {
      keys: ['delhi', 'new delhi', 'qutub', 'india gate', 'red fort'],
      url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80',
      name: 'Delhi'
    },
    {
      keys: ['kyoto', 'tokyo', 'japan', 'osaka', 'fuji'],
      url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
      name: 'Kyoto Japan'
    },
    {
      keys: ['amalfi', 'positano', 'italy', 'rome', 'florence', 'venice'],
      url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
      name: 'Amalfi Coast Italy'
    },
    {
      keys: ['swiss', 'switzerland', 'zermatt', 'alps', 'matterhorn', 'interlaken'],
      url: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=800&q=80',
      name: 'Swiss Alps'
    },
    {
      keys: ['paris', 'france', 'eiffel'],
      url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
      name: 'Paris'
    },
    {
      keys: ['dubai', 'uae', 'burj'],
      url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
      name: 'Dubai'
    },
    {
      keys: ['thailand', 'phuket', 'bangkok', 'krabi'],
      url: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80',
      name: 'Thailand'
    }
  ];

  const THEMATIC_FALLBACKS = [
    {
      pattern: /beach|coast|sea|ocean|island|sand|tropical|shore|wave/i,
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
    },
    {
      pattern: /mountain|hill|peak|himalaya|alps|ridge|trek|snow|glacier|valley/i,
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80'
    },
    {
      pattern: /forest|wildlife|jungle|safari|nature|national park|falls|waterfall|mangrove/i,
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'
    },
    {
      pattern: /temple|spiritual|heritage|palace|fort|monument|ghat|sacred|historic|ancient/i,
      url: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80'
    },
    {
      pattern: /city|urban|metro|downtown|capital|street/i,
      url: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=800&q=80'
    }
  ];

  const DEFAULT_TRAVEL_IMAGE = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80';

  function isGenericPlaceholder(url) {
    if (!url || typeof url !== 'string') return true;
    const clean = url.trim();
    if (clean === '' || clean === 'null' || clean === 'undefined') return true;
    return GENERIC_PLACEHOLDER_IDS.some(id => clean.includes(id));
  }

  function resolveDestinationImage(destinationOrTrip, title = '') {
    let destStr = '';
    let titleStr = title || '';

    if (typeof destinationOrTrip === 'object' && destinationOrTrip !== null) {
      destStr = destinationOrTrip.destination || '';
      if (!titleStr) titleStr = destinationOrTrip.title || '';
    } else if (typeof destinationOrTrip === 'string') {
      destStr = destinationOrTrip;
    }

    const combined = `${destStr} ${titleStr}`.toLowerCase();

    for (const entry of DESTINATION_IMAGE_MAP) {
      for (const key of entry.keys) {
        const regex = new RegExp(`\\b${key}\\b`, 'i');
        if (regex.test(combined) || combined.includes(key)) {
          return entry.url;
        }
      }
    }

    for (const theme of THEMATIC_FALLBACKS) {
      if (theme.pattern.test(combined)) {
        return theme.url;
      }
    }

    return DEFAULT_TRAVEL_IMAGE;
  }

  function getTripCoverImage(trip) {
    if (!trip) return DEFAULT_TRAVEL_IMAGE;
    const rawCover = trip.coverImage;
    if (rawCover && typeof rawCover === 'string' && !isGenericPlaceholder(rawCover)) {
      return rawCover;
    }
    return resolveDestinationImage(trip.destination || '', trip.title || '');
  }

  function handleImageError(imgEl, destination = '', title = '') {
    if (!imgEl) return;
    imgEl.onerror = null; // Prevent infinite loop
    const fallback = resolveDestinationImage(destination, title);
    if (imgEl.src !== fallback) {
      imgEl.src = fallback;
    }
  }

  const DestinationImages = {
    resolve: resolveDestinationImage,
    getTripCoverImage: getTripCoverImage,
    handleImageError: handleImageError,
    isGenericPlaceholder: isGenericPlaceholder,
    DEFAULT_IMAGE: DEFAULT_TRAVEL_IMAGE
  };

  global.DestinationImages = DestinationImages;
  global.getTripImageUrl = getTripCoverImage;

})(typeof window !== 'undefined' ? window : this);
