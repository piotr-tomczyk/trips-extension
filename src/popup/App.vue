<template>
    <div class="popup-body">
        <p>Popup</p>
        <div class="form-container">
            <span> Aircraft: </span>
            <select v-model="selectedAircraft">
                <option
                    v-if="aircrafts.length"
                    :value="null">
                </option>
                <option v-for="aircraft in aircrafts" :key="aircraft" :value="aircraft">
                    {{ aircraft }}
                </option>
            </select>
            <span> Departure: </span>
            <select v-model="selectedDeparture">
                <option
                    v-if="departureAirports.length"
                    :value="null">
                </option>
                <option v-for="airport in departureAirports" :key="airport.id" :value="airport">
                    {{ airport.name }}
                </option>
            </select>
            <span> Destination: </span>
            <select
                v-model="selectedDestination">
                <option
                    v-if="departureAirports.length"
                    :value="null">
                </option>
                <option v-for="airport in departureAirports" :key="airport.id" :value="airport">
                    {{ airport.name }}
                </option>
            </select>
            <span> Leg number: </span>
            <select
                v-model="legNumber">
                <option v-for="leg in legCountOptions" :key="leg" :value="leg">
                    {{ leg }}
                </option>
            </select>
            <span> Hour Limit per leg: </span>
            <select
                v-model="hoursLimit">
                <option v-for="hour in hoursLimitOptions" :key="hour" :value="hour">
                    {{ hour }}
                </option>
            </select>
        </div>
        <button @click="calculateLegs">
            Search
        </button>
        <p>Selected Aircraft: {{ selectedAircraft }}</p>
        <p>Selected Departure: {{ selectedDeparture?.name }}</p>
        <p>Selected Destination: {{ selectedDestination?.name }}</p>
        <p>Leg Number: {{ legNumber }}</p>
        <p>Selected Search Mode: {{ selectedSearchMode }}</p>
        <p>Hours Limit: {{ hoursLimit }}</p>
        <p>
            Found Trip:
            <div v-if="foundTrip">
                <div v-for="leg in foundTrip.legs" :key="leg.start">
                    <p>{{ leg.start }} -> {{ leg.end }}</p>
                </div>
            </div>
        </p>
    </div>
</template>

<script setup lang="ts">
    import { ref, computed } from 'vue';
    import type { Destination, Route } from '../types/Route';
    import spirit from '../va-routes/spirit.json';
    const aircrafts = spirit.aircrafts;
    const routes = spirit.routes;
    const selectedAircraft = ref(null);
    const selectedDeparture = ref<Route | null>(null);
    const selectedDestination = ref<Route | null>(null);
    const legCountOptions = ref([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    const hoursLimit = ref(0);
    const hoursLimitOptions = ref([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const legNumber = ref(0);
    const searchModes = ref(['Legs', 'Trips']);
    const selectedSearchMode = ref('Trips');
    const foundTrip = ref<Trip | null>(null);
    const departureAirports = computed(() => {
        return routes.filter(route => selectedAircraft.value ? route.aircrafts.includes(selectedAircraft.value) : true);
    });
    // const arrivalAirports = computed(() => {
    //     if (!selectedDeparture.value) {
    //         return [];
    //     } else {
    //         return selectedDeparture.value.destinations;
    //     }
    // });

    function calculateLegs() {
        if (!selectedDeparture.value || !selectedSearchMode.value) {
            return null;
        }

        switch (selectedSearchMode.value) {
            case 'Legs':
                console.log('Legs');
                break;
            case 'Trips':
                const startAirport = selectedDeparture.value.icao;
                const destinationAirport = selectedDestination.value?.icao;
                const desiredHours = hoursLimit.value;
                const desiredLegs = legNumber.value;
                // @ts-ignore
                const processedAirports = processData(routes);
                console.log(processedAirports);
                const trips: Trip[] = findTrips(processedAirports, startAirport, destinationAirport || startAirport, desiredLegs + 1, selectedAircraft.value || undefined, desiredHours);
                console.log(trips);
                console.log(trips[(Math.floor(Math.random() * trips.length))]);
                foundTrip.value = trips[(Math.floor(Math.random() * trips.length))];
                break;
            default:
                console.log('Default');
        }
    }

    function processData(data: Route[]): Record<string, Airport> {
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
    interface Airport {
        name: string;
        destinations: { icao: string, time: string }[];
        aircrafts: string[];
    }

    interface Trip {
        legs: { start: string, end: string }[]; // Array of legs
        destination: string; // Still store the final destination
    }

    function findTrips(
        airports: Record<string, Airport>,
        startAirport: string,
        destinationAirport: string,
        desiredLegs: number,
        aircraftType: string = '',
        maxLegTime: number // Time in hours
    ): Trip[] {

        if (maxLegTime === 0) {
            maxLegTime = Infinity;
        }

        const allTrips: Trip[] = [];

        function dfs(startAirport: string, currentTrip: string[]) {
            currentTrip.push(startAirport);

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
                selectedAircraft = findCompatibleAircraft(startAirport, currentTrip[currentTrip.length - 1]);
                if (!selectedAircraft) {
                    return;
                }
            }

            const destinations = airports[startAirport].destinations.slice();
            shuffleArray(destinations);

            for (const destination of destinations) {
                if (!airports[startAirport].aircrafts.includes(selectedAircraft) ||
                    !airports[destination.icao].aircrafts.includes(selectedAircraft)) {
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
        return filterDuplicates(allTrips);

        function findCompatibleAircraft(startAirport: string, destination: string): string | null {
            for (const aircraft of airports[startAirport].aircrafts) {
                if (airports[destination].aircrafts.includes(aircraft)) {
                    return aircraft;
                }
            }
            return null;
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


    function filterDuplicates(trips: Trip[]): Trip[] {
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
</script>

<style scoped>
    .popup-body {
        width: 400px;
        height: 400px;
        margin: 10px;
    }

    .form-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
</style>
