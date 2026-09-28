/**
 * All-India administrative reference data used for the operator filters, the
 * consumer state picker and the regional analytics.
 *
 * IMPORTANT: this file is mirrored byte-for-byte at
 * `client/src/data/indiaRegions.ts` — a test (`server/tests/indiaRegions.test.ts`)
 * fails the build if the two copies drift apart. Edit one, copy it across.
 *
 * `isSpecialCategory` follows the MNRE special-category list used by several
 * central programmes (North-Eastern states, Himachal Pradesh, Uttarakhand,
 * Jammu & Kashmir, Ladakh, Lakshadweep and the Andaman & Nicobar Islands) —
 * it is the flag behind higher central financial assistance.
 *
 * `districts` is a representative list of major districts per state/UT (not an
 * exhaustive revenue-district gazetteer) and `discoms` lists the main
 * distribution utilities, used to drive the dependent filter dropdowns.
 */
export type RegionType = 'state' | 'ut';

export interface IndiaRegion {
  /** ISO 3166-2:IN subdivision code without the "IN-" prefix. */
  code: string;
  name: string;
  type: RegionType;
  isSpecialCategory: boolean;
  discoms: string[];
  districts: string[];
}

export const INDIA_REGIONS: IndiaRegion[] = [
  {
    code: 'AP',
    name: 'Andhra Pradesh',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['APSPDCL (Southern)', 'APEPDCL (Eastern)'],
    districts: ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Kadapa', 'Krishna', 'Kurnool', 'Nellore', 'Prakasam', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'Tirupati', 'Eluru', 'Bapatla'],
  },
  {
    code: 'AR',
    name: 'Arunachal Pradesh',
    type: 'state',
    isSpecialCategory: true,
    discoms: ['Department of Power, Arunachal Pradesh'],
    districts: ['Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Kamle', 'Kra Daadi', 'Lohit', 'Longding', 'Lower Dibang Valley', 'Lower Subansiri', 'Namsai', 'Papum Pare', 'Tawang', 'Tirap', 'West Kameng', 'West Siang', 'Itanagar Capital Complex'],
  },
  {
    code: 'AS',
    name: 'Assam',
    type: 'state',
    isSpecialCategory: true,
    discoms: ['Assam Power Distribution Company Ltd (APDCL)'],
    districts: ['Barpeta', 'Bongaigaon', 'Cachar', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Goalpara', 'Golaghat', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'Tinsukia'],
  },
  {
    code: 'BR',
    name: 'Bihar',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['North Bihar Power Distribution Company Ltd (NBPDCL)', 'South Bihar Power Distribution Company Ltd (SBPDCL)'],
    districts: ['Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Katihar', 'Khagaria', 'Kishanganj', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Samastipur', 'Saran', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran'],
  },
  {
    code: 'CG',
    name: 'Chhattisgarh',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['Chhattisgarh State Power Distribution Company Ltd (CSPDCL)'],
    districts: ['Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Janjgir-Champa', 'Jashpur', 'Kabirdham', 'Kanker', 'Kondagaon', 'Korba', 'Koriya', 'Mahasamund', 'Mungeli', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sukma', 'Surajpur', 'Surguja'],
  },
  {
    code: 'GA',
    name: 'Goa',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['Goa Electricity Department'],
    districts: ['North Goa', 'South Goa'],
  },
  {
    code: 'GJ',
    name: 'Gujarat',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['Dakshin Gujarat Vij Company Ltd (DGVCL)', 'Madhya Gujarat Vij Company Ltd (MGVCL)', 'Paschim Gujarat Vij Company Ltd (PGVCL)', 'Uttar Gujarat Vij Company Ltd (UGVCL)', 'Torrent Power'],
    districts: ['Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'],
  },
  {
    code: 'HR',
    name: 'Haryana',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['Dakshin Haryana Bijli Vitran Nigam (DHBVN)', 'Uttar Haryana Bijli Vitran Nigam (UHBVN)'],
    districts: ['Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'],
  },
  {
    code: 'HP',
    name: 'Himachal Pradesh',
    type: 'state',
    isSpecialCategory: true,
    discoms: ['Himachal Pradesh State Electricity Board Ltd (HPSEBL)'],
    districts: ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'],
  },
  {
    code: 'JH',
    name: 'Jharkhand',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['Jharkhand Bijli Vitran Nigam Ltd (JBVNL)'],
    districts: ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahibganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'],
  },
  {
    code: 'KA',
    name: 'Karnataka',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['Bangalore Electricity Supply Company (BESCOM)', 'Mangalore Electricity Supply Company (MESCOM)', 'Hubli Electricity Supply Company (HESCOM)', 'Gulbarga Electricity Supply Company (GESCOM)', 'Chamundeshwari Electricity Supply Corporation (CESC)'],
    districts: ['Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'],
  },
  {
    code: 'KL',
    name: 'Kerala',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['Kerala State Electricity Board Ltd (KSEBL)'],
    districts: ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
  },
  {
    code: 'MP',
    name: 'Madhya Pradesh',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['MP Poorv Kshetra Vidyut Vitaran Co (MPPKVVCL)', 'MP Madhya Kshetra Vidyut Vitaran Co (MPMKVVCL)', 'MP Paschim Kshetra Vidyut Vitaran Co (MPPaKVVCL)'],
    districts: ['Bhopal', 'Chhindwara', 'Dewas', 'Dhar', 'Gwalior', 'Indore', 'Jabalpur', 'Katni', 'Khandwa', 'Khargone', 'Morena', 'Narmadapuram', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Shahdol', 'Shivpuri', 'Singrauli', 'Ujjain', 'Vidisha'],
  },
  {
    code: 'MH',
    name: 'Maharashtra',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['Maharashtra State Electricity Distribution Co Ltd (MSEDCL)', 'Adani Electricity Mumbai', 'Tata Power Mumbai', 'BEST Mumbai'],
    districts: ['Ahmednagar', 'Akola', 'Amravati', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Chhatrapati Sambhajinagar', 'Dhule', 'Dharashiv', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nashik', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
  },
  {
    code: 'MN',
    name: 'Manipur',
    type: 'state',
    isSpecialCategory: true,
    discoms: ['Manipur State Power Distribution Company Ltd (MSPDCL)'],
    districts: ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'],
  },
  {
    code: 'ML',
    name: 'Meghalaya',
    type: 'state',
    isSpecialCategory: true,
    discoms: ['Meghalaya Power Distribution Corporation Ltd (MePDCL)'],
    districts: ['East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'Eastern West Khasi Hills', 'North Garo Hills', 'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'],
  },
  {
    code: 'MZ',
    name: 'Mizoram',
    type: 'state',
    isSpecialCategory: true,
    discoms: ['Power & Electricity Department, Mizoram'],
    districts: ['Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Saitual', 'Serchhip'],
  },
  {
    code: 'NL',
    name: 'Nagaland',
    type: 'state',
    isSpecialCategory: true,
    discoms: ['Department of Power, Nagaland'],
    districts: ['Chumoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Niuland', 'Noklak', 'Peren', 'Phek', 'Shamator', 'Tseminyu', 'Tuensang', 'Wokha', 'Zunheboto'],
  },
  {
    code: 'OD',
    name: 'Odisha',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['TP Central Odisha Distribution Ltd (TPCODL)', 'TP Western Odisha Distribution Ltd (TPWODL)', 'TP Southern Odisha Distribution Ltd (TPSODL)', 'TP Northern Odisha Distribution Ltd (TPNODL)'],
    districts: ['Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'],
  },
  {
    code: 'PB',
    name: 'Punjab',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['Punjab State Power Corporation Ltd (PSPCL)'],
    districts: ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Mansa', 'Moga', 'Pathankot', 'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar', 'Sangrur', 'Shahid Bhagat Singh Nagar', 'Sri Muktsar Sahib', 'Tarn Taran'],
  },
  {
    code: 'RJ',
    name: 'Rajasthan',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['Jaipur Vidyut Vitran Nigam Ltd (JVVNL)', 'Ajmer Vidyut Vitran Nigam Ltd (AVVNL)', 'Jodhpur Vidyut Vitran Nigam Ltd (JDVVNL)'],
    districts: ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'],
  },
  {
    code: 'SK',
    name: 'Sikkim',
    type: 'state',
    isSpecialCategory: true,
    discoms: ['Energy & Power Department, Sikkim'],
    districts: ['Gangtok', 'Gyalshing', 'Mangan', 'Namchi', 'Pakyong', 'Soreng'],
  },
  {
    code: 'TN',
    name: 'Tamil Nadu',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['Tamil Nadu Generation and Distribution Corporation (TANGEDCO)'],
    districts: ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'],
  },
  {
    code: 'TS',
    name: 'Telangana',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['Telangana Southern Power Distribution Company Ltd (TGSPDCL)', 'Telangana Northern Power Distribution Company Ltd (TGNPDCL)'],
    districts: ['Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad', 'Jagtial', 'Kamareddy', 'Karimnagar', 'Khammam', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Nagarkurnool', 'Nalgonda', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Warangal', 'Yadadri Bhuvanagiri'],
  },
  {
    code: 'TR',
    name: 'Tripura',
    type: 'state',
    isSpecialCategory: true,
    discoms: ['Tripura State Electricity Corporation Ltd (TSECL)'],
    districts: ['Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura', 'Unakoti', 'West Tripura'],
  },
  {
    code: 'UP',
    name: 'Uttar Pradesh',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['Paschimanchal Vidyut Vitran Nigam (PVVNL)', 'Madhyanchal Vidyut Vitran Nigam (MVVNL)', 'Dakshinanchal Vidyut Vitran Nigam (DVVNL)', 'Purvanchal Vidyut Vitran Nigam (PuVVNL)', 'Kanpur Electricity Supply Company (KESCO)', 'Noida Power Company Ltd (NPCL)'],
    districts: ['Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kheri', 'Kushinagar', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Prayagraj', 'Rae Bareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],
  },
  {
    code: 'UK',
    name: 'Uttarakhand',
    type: 'state',
    isSpecialCategory: true,
    discoms: ['Uttarakhand Power Corporation Ltd (UPCL)'],
    districts: ['Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'],
  },
  {
    code: 'WB',
    name: 'West Bengal',
    type: 'state',
    isSpecialCategory: false,
    discoms: ['West Bengal State Electricity Distribution Company Ltd (WBSEDCL)', 'CESC Ltd (Kolkata)'],
    districts: ['Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'],
  },
  {
    code: 'AN',
    name: 'Andaman and Nicobar Islands',
    type: 'ut',
    isSpecialCategory: true,
    discoms: ['Electricity Department, Andaman & Nicobar Islands'],
    districts: ['Nicobar', 'North and Middle Andaman', 'South Andaman'],
  },
  {
    code: 'CH',
    name: 'Chandigarh',
    type: 'ut',
    isSpecialCategory: false,
    discoms: ['Chandigarh Electricity Department'],
    districts: ['Chandigarh'],
  },
  {
    code: 'DH',
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    type: 'ut',
    isSpecialCategory: false,
    discoms: ['DNH & DD Power Distribution Corporation Ltd'],
    districts: ['Dadra and Nagar Haveli', 'Daman', 'Diu'],
  },
  {
    code: 'DL',
    name: 'Delhi',
    type: 'ut',
    isSpecialCategory: false,
    discoms: ['BSES Rajdhani Power Ltd (BRPL)', 'BSES Yamuna Power Ltd (BYPL)', 'Tata Power Delhi Distribution Ltd (TPDDL)'],
    districts: ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],
  },
  {
    code: 'JK',
    name: 'Jammu and Kashmir',
    type: 'ut',
    isSpecialCategory: true,
    discoms: ['Jammu Power Distribution Corporation Ltd (JPDCL)', 'Kashmir Power Distribution Corporation Ltd (KPDCL)'],
    districts: ['Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'],
  },
  {
    code: 'LA',
    name: 'Ladakh',
    type: 'ut',
    isSpecialCategory: true,
    discoms: ['Ladakh Power Development Department (LPDD)'],
    districts: ['Kargil', 'Leh'],
  },
  {
    code: 'LD',
    name: 'Lakshadweep',
    type: 'ut',
    isSpecialCategory: true,
    discoms: ['Lakshadweep Electricity Department'],
    districts: ['Lakshadweep'],
  },
  {
    code: 'PY',
    name: 'Puducherry',
    type: 'ut',
    isSpecialCategory: false,
    discoms: ['Electricity Department, Puducherry'],
    districts: ['Karaikal', 'Mahe', 'Puducherry', 'Yanam'],
  },
];

export const INDIA_STATES = INDIA_REGIONS.filter((region) => region.type === 'state');
export const INDIA_UNION_TERRITORIES = INDIA_REGIONS.filter((region) => region.type === 'ut');

export const REGION_NAMES = INDIA_REGIONS.map((region) => region.name);

const BY_NAME = new Map(INDIA_REGIONS.map((region) => [region.name.toLowerCase(), region]));
const BY_CODE = new Map(INDIA_REGIONS.map((region) => [region.code, region]));

export function findRegion(nameOrCode: string | undefined): IndiaRegion | undefined {
  if (!nameOrCode) return undefined;
  const key = nameOrCode.trim().toLowerCase();
  return BY_NAME.get(key) ?? BY_CODE.get(nameOrCode.trim().toUpperCase());
}

export const isKnownRegion = (nameOrCode: string | undefined): boolean => Boolean(findRegion(nameOrCode));

export const isSpecialCategoryRegion = (nameOrCode: string | undefined): boolean => findRegion(nameOrCode)?.isSpecialCategory ?? false;

export function districtsForRegion(nameOrCode: string | undefined): string[] {
  return findRegion(nameOrCode)?.districts ?? [];
}

export function discomsForRegion(nameOrCode: string | undefined): string[] {
  return findRegion(nameOrCode)?.discoms ?? [];
}
