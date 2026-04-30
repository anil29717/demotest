export const INDIA_STATE_CITY_MAP: Record<string, string[]> = {
  Delhi: ["New Delhi"],
  Maharashtra: [
    "Mumbai",
    "Pune",
    "Nagpur",
    "Nashik",
    "Thane",
    "Aurangabad",
    "Solapur",
    "Kolhapur",
  ],
  Karnataka: ["Bangalore", "Mysore", "Mangalore", "Hubli", "Belgaum", "Davangere"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Trichy", "Tirunelveli"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"],
  "Uttar Pradesh": [
    "Noida",
    "Greater Noida",
    "Ghaziabad",
    "Lucknow",
    "Kanpur",
    "Varanasi",
    "Agra",
    "Meerut",
    "Prayagraj",
  ],
  Haryana: ["Gurgaon", "Faridabad", "Panipat", "Ambala", "Hisar", "Rohtak"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar"],
  Rajasthan: ["Jaipur", "Udaipur", "Jodhpur", "Kota", "Ajmer", "Bikaner"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Gwalior", "Jabalpur", "Ujjain"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"],
  Bihar: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Mohali"],
  Kerala: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Puri"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  Chhattisgarh: ["Raipur", "Bhilai", "Bilaspur"],
  Uttarakhand: ["Dehradun", "Haridwar", "Roorkee", "Haldwani"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi"],
  Goa: ["Panaji", "Margao", "Vasco da Gama"],
  Assam: ["Guwahati", "Dibrugarh", "Silchar"],
  "Jammu and Kashmir": ["Srinagar", "Jammu"],
  Ladakh: ["Leh", "Kargil"],
};

export const INDIA_STATES = Object.keys(INDIA_STATE_CITY_MAP);

export function citiesForState(state: string): string[] {
  return INDIA_STATE_CITY_MAP[state] ?? [];
}
