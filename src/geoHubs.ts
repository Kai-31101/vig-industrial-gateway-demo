// Curated transport/city hubs. Coordinates were resolved with Goong (Place AutoComplete -> Place Detail) by scripts/geo/resolve-hubs.ts on 2026-11-26.
// Do not edit by hand; rerun the script. Used by server/geo.ts (nearest hubs per park) - there is no keyword search for these categories.
import type {NearbyCategory,LocalizedText} from './types';
export interface Hub {category:Extract<NearbyCategory,'airport'|'seaport'|'rail'|'town'>;name:LocalizedText;coordinates:{lat:number;lng:number}}
export const HUBS:Hub[]=[
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay quốc tế Nội Bài",
   "en": "Noi Bai International Airport",
   "zh": "Noi Bai International Airport"
  },
  "coordinates": {
   "lat": 21.21744,
   "lng": 105.79886
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay quốc tế Cát Bi",
   "en": "Cat Bi International Airport",
   "zh": "Cat Bi International Airport"
  },
  "coordinates": {
   "lat": 20.82402,
   "lng": 106.72723
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay quốc tế Vân Đồn",
   "en": "Van Don International Airport",
   "zh": "Van Don International Airport"
  },
  "coordinates": {
   "lat": 21.11674,
   "lng": 107.41922
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay Điện Biên Phủ",
   "en": "Dien Bien Phu Airport",
   "zh": "Dien Bien Phu Airport"
  },
  "coordinates": {
   "lat": 21.40097,
   "lng": 103.00645
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay Thọ Xuân",
   "en": "Tho Xuan Airport",
   "zh": "Tho Xuan Airport"
  },
  "coordinates": {
   "lat": 19.89289,
   "lng": 105.47617
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay quốc tế Vinh",
   "en": "Vinh International Airport",
   "zh": "Vinh International Airport"
  },
  "coordinates": {
   "lat": 18.72903,
   "lng": 105.66882
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay Đồng Hới",
   "en": "Dong Hoi Airport",
   "zh": "Dong Hoi Airport"
  },
  "coordinates": {
   "lat": 17.51234,
   "lng": 106.58964
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay quốc tế Phú Bài",
   "en": "Phu Bai International Airport",
   "zh": "Phu Bai International Airport"
  },
  "coordinates": {
   "lat": 16.39784,
   "lng": 107.70033
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay quốc tế Đà Nẵng",
   "en": "Da Nang International Airport",
   "zh": "Da Nang International Airport"
  },
  "coordinates": {
   "lat": 16.05381,
   "lng": 108.20276
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay Chu Lai",
   "en": "Chu Lai Airport",
   "zh": "Chu Lai Airport"
  },
  "coordinates": {
   "lat": 15.41625,
   "lng": 108.6969
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay Phù Cát",
   "en": "Phu Cat Airport",
   "zh": "Phu Cat Airport"
  },
  "coordinates": {
   "lat": 13.95303,
   "lng": 109.04876
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay Tuy Hòa",
   "en": "Tuy Hoa Airport",
   "zh": "Tuy Hoa Airport"
  },
  "coordinates": {
   "lat": 13.0477,
   "lng": 109.33078
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay quốc tế Cam Ranh",
   "en": "Cam Ranh International Airport",
   "zh": "Cam Ranh International Airport"
  },
  "coordinates": {
   "lat": 12.00302,
   "lng": 109.21795
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay Liên Khương",
   "en": "Lien Khuong Airport",
   "zh": "Lien Khuong Airport"
  },
  "coordinates": {
   "lat": 11.749,
   "lng": 108.36821
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay Buôn Ma Thuột",
   "en": "Buon Ma Thuot Airport",
   "zh": "Buon Ma Thuot Airport"
  },
  "coordinates": {
   "lat": 12.66515,
   "lng": 108.11664
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay Pleiku",
   "en": "Pleiku Airport",
   "zh": "Pleiku Airport"
  },
  "coordinates": {
   "lat": 14.0066,
   "lng": 108.00684
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay quốc tế Tân Sơn Nhất",
   "en": "Tan Son Nhat International Airport",
   "zh": "Tan Son Nhat International Airport"
  },
  "coordinates": {
   "lat": 10.81567,
   "lng": 106.66284
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay Côn Đảo",
   "en": "Con Dao Airport",
   "zh": "Con Dao Airport"
  },
  "coordinates": {
   "lat": 8.73286,
   "lng": 106.62984
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay quốc tế Cần Thơ",
   "en": "Can Tho International Airport",
   "zh": "Can Tho International Airport"
  },
  "coordinates": {
   "lat": 10.07904,
   "lng": 105.7133
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay Rạch Giá",
   "en": "Rach Gia Airport",
   "zh": "Rach Gia Airport"
  },
  "coordinates": {
   "lat": 9.96092,
   "lng": 105.1336
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay Cà Mau",
   "en": "Ca Mau Airport",
   "zh": "Ca Mau Airport"
  },
  "coordinates": {
   "lat": 9.17632,
   "lng": 105.17594
  }
 },
 {
  "category": "airport",
  "name": {
   "vi": "Sân bay quốc tế Phú Quốc",
   "en": "Phu Quoc International Airport",
   "zh": "Phu Quoc International Airport"
  },
  "coordinates": {
   "lat": 10.1613,
   "lng": 103.99795
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng quốc tế Lạch Huyện (Hải Phòng)",
   "en": "Lach Huyen International Port (Hai Phong)",
   "zh": "Lach Huyen International Port (Hai Phong)"
  },
  "coordinates": {
   "lat": 20.79944,
   "lng": 106.90658
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Đình Vũ (Hải Phòng)",
   "en": "Dinh Vu Port (Hai Phong)",
   "zh": "Dinh Vu Port (Hai Phong)"
  },
  "coordinates": {
   "lat": 20.84201,
   "lng": 106.76845
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Chùa Vẽ (Hải Phòng)",
   "en": "Chua Ve Port (Hai Phong)",
   "zh": "Chua Ve Port (Hai Phong)"
  },
  "coordinates": {
   "lat": 20.85678,
   "lng": 106.72601
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Hải Phòng (Hoàng Diệu)",
   "en": "Hai Phong Port (Hoang Dieu)",
   "zh": "Hai Phong Port (Hoang Dieu)"
  },
  "coordinates": {
   "lat": 20.86519,
   "lng": 106.69733
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Cái Lân (Quảng Ninh)",
   "en": "Cai Lan Port (Quang Ninh)",
   "zh": "Cai Lan Port (Quang Ninh)"
  },
  "coordinates": {
   "lat": 20.97222,
   "lng": 107.05623
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Nghi Sơn (Thanh Hóa)",
   "en": "Nghi Son Port (Thanh Hoa)",
   "zh": "Nghi Son Port (Thanh Hoa)"
  },
  "coordinates": {
   "lat": 19.3073,
   "lng": 105.82125
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Cửa Lò (Nghệ An)",
   "en": "Cua Lo Port (Nghe An)",
   "zh": "Cua Lo Port (Nghe An)"
  },
  "coordinates": {
   "lat": 18.82711,
   "lng": 105.70956
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Vũng Áng (Hà Tĩnh)",
   "en": "Vung Ang Port (Ha Tinh)",
   "zh": "Vung Ang Port (Ha Tinh)"
  },
  "coordinates": {
   "lat": 18.10997,
   "lng": 106.40843
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Chân Mây (Huế)",
   "en": "Chan May Port (Hue)",
   "zh": "Chan May Port (Hue)"
  },
  "coordinates": {
   "lat": 16.33261,
   "lng": 108.01869
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Tiên Sa (Đà Nẵng)",
   "en": "Tien Sa Port (Da Nang)",
   "zh": "Tien Sa Port (Da Nang)"
  },
  "coordinates": {
   "lat": 16.1211,
   "lng": 108.2184
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Dung Quất (Quảng Ngãi)",
   "en": "Dung Quat Port (Quang Ngai)",
   "zh": "Dung Quat Port (Quang Ngai)"
  },
  "coordinates": {
   "lat": 15.41546,
   "lng": 108.79604
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Kỳ Hà (Chu Lai)",
   "en": "Ky Ha Port (Chu Lai)",
   "zh": "Ky Ha Port (Chu Lai)"
  },
  "coordinates": {
   "lat": 15.47498,
   "lng": 108.685
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Quy Nhơn",
   "en": "Quy Nhon Port",
   "zh": "Quy Nhon Port"
  },
  "coordinates": {
   "lat": 13.77442,
   "lng": 109.24398
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Nha Trang",
   "en": "Nha Trang Port",
   "zh": "Nha Trang Port"
  },
  "coordinates": {
   "lat": 12.20542,
   "lng": 109.21632
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Ba Ngòi (Cam Ranh)",
   "en": "Ba Ngoi Port (Cam Ranh)",
   "zh": "Ba Ngoi Port (Cam Ranh)"
  },
  "coordinates": {
   "lat": 11.89576,
   "lng": 109.14744
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Cát Lái (TP. Hồ Chí Minh)",
   "en": "Cat Lai Port (Ho Chi Minh City)",
   "zh": "Cat Lai Port (Ho Chi Minh City)"
  },
  "coordinates": {
   "lat": 10.7587,
   "lng": 106.79028
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Hiệp Phước (TP. Hồ Chí Minh)",
   "en": "Hiep Phuoc Port (Ho Chi Minh City)",
   "zh": "Hiep Phuoc Port (Ho Chi Minh City)"
  },
  "coordinates": {
   "lat": 10.63607,
   "lng": 106.75702
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Cái Mép (Bà Rịa - Vũng Tàu)",
   "en": "Cai Mep Port (Ba Ria - Vung Tau)",
   "zh": "Cai Mep Port (Ba Ria - Vung Tau)"
  },
  "coordinates": {
   "lat": 10.50928,
   "lng": 107.01782
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Thị Vải (Bà Rịa - Vũng Tàu)",
   "en": "Thi Vai Port (Ba Ria - Vung Tau)",
   "zh": "Thi Vai Port (Ba Ria - Vung Tau)"
  },
  "coordinates": {
   "lat": 10.52102,
   "lng": 107.02379
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Phú Mỹ (Bà Rịa - Vũng Tàu)",
   "en": "Phu My Port (Ba Ria - Vung Tau)",
   "zh": "Phu My Port (Ba Ria - Vung Tau)"
  },
  "coordinates": {
   "lat": 10.58884,
   "lng": 107.0308
  }
 },
 {
  "category": "seaport",
  "name": {
   "vi": "Cảng Cái Cui (Cần Thơ)",
   "en": "Cai Cui Port (Can Tho)",
   "zh": "Cai Cui Port (Can Tho)"
  },
  "coordinates": {
   "lat": 10.00821,
   "lng": 105.79401
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Hà Nội",
   "en": "Hanoi Railway Station",
   "zh": "Hanoi Railway Station"
  },
  "coordinates": {
   "lat": 21.02442,
   "lng": 105.84123
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Giáp Bát",
   "en": "Giap Bat Station",
   "zh": "Giap Bat Station"
  },
  "coordinates": {
   "lat": 20.97869,
   "lng": 105.84034
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Yên Viên",
   "en": "Yen Vien Station",
   "zh": "Yen Vien Station"
  },
  "coordinates": {
   "lat": 21.08562,
   "lng": 105.91642
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Hải Phòng",
   "en": "Hai Phong Station",
   "zh": "Hai Phong Station"
  },
  "coordinates": {
   "lat": 20.85684,
   "lng": 106.68728
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Lào Cai",
   "en": "Lao Cai Station",
   "zh": "Lao Cai Station"
  },
  "coordinates": {
   "lat": 22.49214,
   "lng": 103.97826
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Đồng Đăng",
   "en": "Dong Dang Station",
   "zh": "Dong Dang Station"
  },
  "coordinates": {
   "lat": 21.94284,
   "lng": 106.69776
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Vinh",
   "en": "Vinh Station",
   "zh": "Vinh Station"
  },
  "coordinates": {
   "lat": 18.68769,
   "lng": 105.66505
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Đông Hà",
   "en": "Dong Ha Station",
   "zh": "Dong Ha Station"
  },
  "coordinates": {
   "lat": 16.81137,
   "lng": 107.11188
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Huế",
   "en": "Hue Station",
   "zh": "Hue Station"
  },
  "coordinates": {
   "lat": 16.45668,
   "lng": 107.57851
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Đà Nẵng",
   "en": "Da Nang Station",
   "zh": "Da Nang Station"
  },
  "coordinates": {
   "lat": 16.07151,
   "lng": 108.20932
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Diêu Trì",
   "en": "Dieu Tri Station",
   "zh": "Dieu Tri Station"
  },
  "coordinates": {
   "lat": 13.8071,
   "lng": 109.14367
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Nha Trang",
   "en": "Nha Trang Station",
   "zh": "Nha Trang Station"
  },
  "coordinates": {
   "lat": 12.24858,
   "lng": 109.18441
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Tháp Chàm",
   "en": "Thap Cham Station",
   "zh": "Thap Cham Station"
  },
  "coordinates": {
   "lat": 11.59724,
   "lng": 108.94992
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Sóng Thần",
   "en": "Song Than Station",
   "zh": "Song Than Station"
  },
  "coordinates": {
   "lat": 10.8808,
   "lng": 106.75079
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Sài Gòn",
   "en": "Saigon Station",
   "zh": "Saigon Station"
  },
  "coordinates": {
   "lat": 10.78179,
   "lng": 106.67798
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Biên Hòa",
   "en": "Bien Hoa Station",
   "zh": "Bien Hoa Station"
  },
  "coordinates": {
   "lat": 10.95087,
   "lng": 106.82637
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Thanh Hóa",
   "en": "Thanh Hoa Station",
   "zh": "Thanh Hoa Station"
  },
  "coordinates": {
   "lat": 19.8128,
   "lng": 105.76798
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Ninh Bình",
   "en": "Ninh Binh Station",
   "zh": "Ninh Binh Station"
  },
  "coordinates": {
   "lat": 20.24211,
   "lng": 105.97455
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Nam Định",
   "en": "Nam Dinh Station",
   "zh": "Nam Dinh Station"
  },
  "coordinates": {
   "lat": 20.42153,
   "lng": 106.16477
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Bắc Giang",
   "en": "Bac Giang Station",
   "zh": "Bac Giang Station"
  },
  "coordinates": {
   "lat": 21.27866,
   "lng": 106.1919
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Thái Nguyên",
   "en": "Thai Nguyen Station",
   "zh": "Thai Nguyen Station"
  },
  "coordinates": {
   "lat": 21.58692,
   "lng": 105.82401
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Phủ Lý",
   "en": "Phu Ly Station",
   "zh": "Phu Ly Station"
  },
  "coordinates": {
   "lat": 20.54062,
   "lng": 105.91279
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Đồng Hới",
   "en": "Dong Hoi Station",
   "zh": "Dong Hoi Station"
  },
  "coordinates": {
   "lat": 17.46884,
   "lng": 106.59955
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Quảng Ngãi",
   "en": "Quang Ngai Station",
   "zh": "Quang Ngai Station"
  },
  "coordinates": {
   "lat": 15.12108,
   "lng": 108.78146
  }
 },
 {
  "category": "rail",
  "name": {
   "vi": "Ga Tuy Hòa",
   "en": "Tuy Hoa Station",
   "zh": "Tuy Hoa Station"
  },
  "coordinates": {
   "lat": 13.08835,
   "lng": 109.2975
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Hà Nội",
   "en": "Hanoi",
   "zh": "Hanoi"
  },
  "coordinates": {
   "lat": 21.0282,
   "lng": 105.85416
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Hải Phòng",
   "en": "Hai Phong",
   "zh": "Hai Phong"
  },
  "coordinates": {
   "lat": 20.86455,
   "lng": 106.68581
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Hạ Long (Quảng Ninh)",
   "en": "Ha Long (Quang Ninh)",
   "zh": "Ha Long (Quang Ninh)"
  },
  "coordinates": {
   "lat": 20.95018,
   "lng": 107.0379
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Bắc Ninh",
   "en": "Bac Ninh",
   "zh": "Bac Ninh"
  },
  "coordinates": {
   "lat": 21.18555,
   "lng": 106.07598
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Hưng Yên",
   "en": "Hung Yen",
   "zh": "Hung Yen"
  },
  "coordinates": {
   "lat": 20.65576,
   "lng": 106.05553
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Thái Bình",
   "en": "Thai Binh",
   "zh": "Thai Binh"
  },
  "coordinates": {
   "lat": 20.45276,
   "lng": 106.34682
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Nam Định",
   "en": "Nam Dinh",
   "zh": "Nam Dinh"
  },
  "coordinates": {
   "lat": 20.43463,
   "lng": 106.1777
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Ninh Bình",
   "en": "Ninh Binh",
   "zh": "Ninh Binh"
  },
  "coordinates": {
   "lat": 20.25843,
   "lng": 105.97635
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Hải Dương",
   "en": "Hai Duong",
   "zh": "Hai Duong"
  },
  "coordinates": {
   "lat": 20.94086,
   "lng": 106.33374
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Vĩnh Yên (Vĩnh Phúc)",
   "en": "Vinh Yen (Vinh Phuc)",
   "zh": "Vinh Yen (Vinh Phuc)"
  },
  "coordinates": {
   "lat": 21.29607,
   "lng": 105.57037
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Bắc Giang",
   "en": "Bac Giang",
   "zh": "Bac Giang"
  },
  "coordinates": {
   "lat": 21.276,
   "lng": 106.20103
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Thái Nguyên",
   "en": "Thai Nguyen",
   "zh": "Thai Nguyen"
  },
  "coordinates": {
   "lat": 21.59491,
   "lng": 105.84075
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Việt Trì (Phú Thọ)",
   "en": "Viet Tri (Phu Tho)",
   "zh": "Viet Tri (Phu Tho)"
  },
  "coordinates": {
   "lat": 21.33365,
   "lng": 105.40364
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Lào Cai",
   "en": "Lao Cai",
   "zh": "Lao Cai"
  },
  "coordinates": {
   "lat": 22.44218,
   "lng": 104.00521
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Thanh Hóa",
   "en": "Thanh Hoa",
   "zh": "Thanh Hoa"
  },
  "coordinates": {
   "lat": 19.80765,
   "lng": 105.7756
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Vinh (Nghệ An)",
   "en": "Vinh (Nghe An)",
   "zh": "Vinh (Nghe An)"
  },
  "coordinates": {
   "lat": 18.67053,
   "lng": 105.68424
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Hà Tĩnh",
   "en": "Ha Tinh",
   "zh": "Ha Tinh"
  },
  "coordinates": {
   "lat": 18.34254,
   "lng": 105.90549
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Đồng Hới (Quảng Trị)",
   "en": "Dong Hoi (Quang Tri)",
   "zh": "Dong Hoi (Quang Tri)"
  },
  "coordinates": {
   "lat": 17.46001,
   "lng": 106.61876
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Huế",
   "en": "Hue",
   "zh": "Hue"
  },
  "coordinates": {
   "lat": 16.46637,
   "lng": 107.58926
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Đà Nẵng",
   "en": "Da Nang",
   "zh": "Da Nang"
  },
  "coordinates": {
   "lat": 16.07471,
   "lng": 108.22431
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Tam Kỳ (Đà Nẵng)",
   "en": "Tam Ky (Da Nang)",
   "zh": "Tam Ky (Da Nang)"
  },
  "coordinates": {
   "lat": 15.55156,
   "lng": 108.47701
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Quảng Ngãi",
   "en": "Quang Ngai",
   "zh": "Quang Ngai"
  },
  "coordinates": {
   "lat": 15.12251,
   "lng": 108.80031
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Quy Nhơn",
   "en": "Quy Nhon",
   "zh": "Quy Nhon"
  },
  "coordinates": {
   "lat": 13.77005,
   "lng": 109.23223
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Nha Trang",
   "en": "Nha Trang",
   "zh": "Nha Trang"
  },
  "coordinates": {
   "lat": 12.24074,
   "lng": 109.19565
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Đà Lạt",
   "en": "Da Lat",
   "zh": "Da Lat"
  },
  "coordinates": {
   "lat": 11.94042,
   "lng": 108.45831
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Buôn Ma Thuột",
   "en": "Buon Ma Thuot",
   "zh": "Buon Ma Thuot"
  },
  "coordinates": {
   "lat": 12.71492,
   "lng": 108.03779
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Pleiku",
   "en": "Pleiku",
   "zh": "Pleiku"
  },
  "coordinates": {
   "lat": 13.98621,
   "lng": 108.0164
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "TP. Hồ Chí Minh",
   "en": "Ho Chi Minh City",
   "zh": "Ho Chi Minh City"
  },
  "coordinates": {
   "lat": 10.77655,
   "lng": 106.70105
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Biên Hòa (Đồng Nai)",
   "en": "Bien Hoa (Dong Nai)",
   "zh": "Bien Hoa (Dong Nai)"
  },
  "coordinates": {
   "lat": 10.93433,
   "lng": 106.80119
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Thủ Dầu Một",
   "en": "Thu Dau Mot",
   "zh": "Thu Dau Mot"
  },
  "coordinates": {
   "lat": 10.98279,
   "lng": 106.67577
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Tây Ninh",
   "en": "Tay Ninh",
   "zh": "Tay Ninh"
  },
  "coordinates": {
   "lat": 11.31426,
   "lng": 106.09343
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Vũng Tàu",
   "en": "Vung Tau",
   "zh": "Vung Tau"
  },
  "coordinates": {
   "lat": 10.33774,
   "lng": 107.08384
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Tân An (Long An)",
   "en": "Tan An (Long An)",
   "zh": "Tan An (Long An)"
  },
  "coordinates": {
   "lat": 10.54019,
   "lng": 106.40383
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Cần Thơ",
   "en": "Can Tho",
   "zh": "Can Tho"
  },
  "coordinates": {
   "lat": 10.03653,
   "lng": 105.78778
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Vĩnh Long",
   "en": "Vinh Long",
   "zh": "Vinh Long"
  },
  "coordinates": {
   "lat": 10.25415,
   "lng": 105.97205
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Long Xuyên (An Giang)",
   "en": "Long Xuyen (An Giang)",
   "zh": "Long Xuyen (An Giang)"
  },
  "coordinates": {
   "lat": 10.38229,
   "lng": 105.44155
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Cà Mau",
   "en": "Ca Mau",
   "zh": "Ca Mau"
  },
  "coordinates": {
   "lat": 9.17653,
   "lng": 105.1515
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Phan Thiết",
   "en": "Phan Thiet",
   "zh": "Phan Thiet"
  },
  "coordinates": {
   "lat": 10.9221,
   "lng": 108.09936
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Đông Hà",
   "en": "Dong Ha",
   "zh": "Dong Ha"
  },
  "coordinates": {
   "lat": 16.81922,
   "lng": 107.074
  }
 },
 {
  "category": "town",
  "name": {
   "vi": "Phủ Lý",
   "en": "Phu Ly",
   "zh": "Phu Ly"
  },
  "coordinates": {
   "lat": 20.53169,
   "lng": 105.91763
  }
 }
];
