import { Route, Trip, Airport } from '../types/types';

export class TripService {
    constructor() {
    }

    public findTrips(
        airportsToProcess: Route[],
        startAirport: string,
        destinationAirport: string,
        desiredLegs: number,
        aircraftType: string = '',
        maxLegTime: number // Time in hours
    ): { trips: Trip[], aircraftType: string } {
        const airports = this.processData(airportsToProcess);
        if (maxLegTime === 0) {
            maxLegTime = Infinity;
        }

        const allTrips: Trip[] = [];

        function dfs(startAirport: string, currentTrip: string[]) {
            currentTrip.push(startAirport);

            if (startAirport === destinationAirport && currentTrip.length > 1 && currentTrip.length !== desiredLegs) {
                return;
            }

            if (currentTrip.length === desiredLegs && startAirport === destinationAirport) {
                allTrips.push({
                    legs: currentTrip.slice(0, -1).map((icao, index) => ({ start: icao, end: currentTrip[index + 1] })),
                    destination: startAirport
                });
                return;
            }

            if (currentTrip.length >= desiredLegs) {
                return;
            }

            let selectedAircraft = aircraftType || null;
            if (!selectedAircraft) {
                aircraftType = findCompatibleAircraft(startAirport, currentTrip[currentTrip.length - 1]) || '';
                selectedAircraft = aircraftType;
                if (!selectedAircraft) {
                    return;
                }
            }

            const destinations = airports[startAirport].destinations.slice();
            // shuffleArray(destinations);

            for (const destination of destinations) {
                if (!airports?.[startAirport]?.aircrafts?.includes(aircraftType) ||
                    !airports?.[destination.icao]?.aircrafts.includes(aircraftType)) {
                    continue;
                }

                const legTime = convertTimeToHours(destination.time);
                if (legTime > maxLegTime) {
                    continue;
                }

                dfs(destination.icao, currentTrip.slice());
            }
        }

        dfs(startAirport, []);
        return { trips: this.filterDuplicates(allTrips), aircraftType };

        function findCompatibleAircraft(startAirport: string, destination: string): string | null {
            const compatibleAircrafts: string[] = [];
            for (const aircraft of airports?.[startAirport]?.aircrafts) {
                if (airports?.[destination]?.aircrafts?.includes(aircraft)) {
                    compatibleAircrafts.push(aircraft);
                }
            }
            return compatibleAircrafts.length > 0 ?
                compatibleAircrafts[Math.floor(Math.random() * compatibleAircrafts.length)] :
                null;
        }
        function shuffleArray(array: any[]) {
            // Fisher-Yates Shuffle Implementation
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }
        function convertTimeToHours(timeString: string): number {
            const [hoursStr, minutesStr, secondsStr] = timeString.split(':');
            const hours = parseFloat(hoursStr);
            const minutes = parseFloat(minutesStr) / 60;
            const seconds = parseFloat(secondsStr) / 3600;
            return hours + minutes + seconds;
        }
    }

    private processData(data: Route[]): Record<string, Airport> {
        const airports: Record<string, Airport> = {};

        for (const base of data) {
            airports[base.icao] = {
                name: base.name,
                destinations: base.destinations.map(dest => ({ icao: dest.icao, time: dest.time })),
                aircrafts: base.aircrafts
            };
        }
        return airports;
    }



    private filterDuplicates(trips: Trip[]): Trip[] {
        const uniqueTrips = new Set<string>();
        const filteredTrips: Trip[] = [];

        for (const trip of trips) {
            const tripKey = trip.legs.map(leg => `${leg.start}-${leg.end}`).join('-') +  '-' + trip.destination;
            if (!uniqueTrips.has(tripKey)) {
                uniqueTrips.add(tripKey);
                filteredTrips.push(trip);
            }
        }
        return filteredTrips;
    }
}
