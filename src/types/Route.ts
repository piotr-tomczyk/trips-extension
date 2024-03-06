export interface Destination {
    id: number;
    pair_id: number;
    name: string;
    icao: string;
    iata: string;
    latitude: string;
    longitude: string;
    callsigns: string[];
    types: string[];
    distance: number;
    time: string;
}

export interface Route {
    id: number;
    name: string;
    icao: string;
    iata: string;
    base: boolean;
    latitude: string;
    longitude: string;
    destinations: Destination[];
    aircrafts: string[];
}
