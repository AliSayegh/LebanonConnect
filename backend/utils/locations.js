const CITY_TO_DISTRICT = {
  "Beirut": "Beirut",
  "Tripoli": "Tripoli",
  "Sidon": "Sidon",
  "Tyre": "Tyre",
  "Jounieh": "Keserwan",
  "Zahle": "Zahle",
  "Baalbek": "Baalbek",
  "Byblos": "Byblos",
  "Aley": "Aley",
  "Bhamdoun": "Aley",
  "Broummana": "Metn",
  "Dbayeh": "Metn",
  "Jbeil": "Byblos",
  "Batroun": "Batroun",
  "Chekka": "Batroun",
  "Halba": "Akkar",
  "Miniyeh": "Miniyeh-Danniyeh",
  "Akkar": "Akkar",
  "Hermel": "Hermel",
  "Nabatieh": "Nabatieh",
  "Bint Jbeil": "Bint Jbeil",
  "Marjayoun": "Marjayoun",
  "Hasbaya": "Hasbaya",
  "Rashaya": "Rashaya",
  "Chouf": "Chouf",
  "Deir El Qamar": "Chouf",
  "Barja": "Chouf",
  "Damour": "Chouf",
  "Khaldeh": "Aley",
  "Baabda": "Baabda",
  "Hazmieh": "Baabda",
  "Hadath": "Baabda",
  "Choueifat": "Aley",
  "Ain El Remmaneh": "Baabda",
  "Furn El Chebbak": "Baabda",
  "Sin El Fil": "Metn",
  "Dekwaneh": "Metn",
  "Antelias": "Metn",
  "Zalka": "Metn",
  "Jal El Dib": "Metn",
  "Rabieh": "Metn",
  "Kaslik": "Keserwan",
  "Adma": "Keserwan",
  "Safra": "Keserwan",
  "Tabarja": "Keserwan",
  "Faraya": "Keserwan",
  "Kfardebian": "Keserwan",
  "Ehden": "Zgharta",
  "Zgharta": "Zgharta",
  "Amioun": "Koura",
  "Koura": "Koura",
  "Anfeh": "Koura",
  "Qalamoun": "Koura",
  "Aramoun": "Aley",
  "Naameh": "Chouf",
  "Jiayeh": "Chouf",
  "Sarafand": "Sidon",
  "Adloun": "Sidon",
  "Ghaziyeh": "Sidon",
  "Kfarshima": "Baabda",
  "Bsous": "Baabda",
  "Bikfaya": "Metn",
  "Beit Mery": "Metn",
  "Mansourieh": "Metn",
  "Monteverde": "Metn"
};

const cities = Object.keys(CITY_TO_DISTRICT);

function getDistrictByCity(city) {
  if (!city || typeof city !== "string") return "";
  return CITY_TO_DISTRICT[city.trim()] || "";
}

function isValidCity(city) {
  return Boolean(getDistrictByCity(city));
}

module.exports = { CITY_TO_DISTRICT, cities, getDistrictByCity, isValidCity };

