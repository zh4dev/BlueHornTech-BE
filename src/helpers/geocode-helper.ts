import axios from "axios";

class GeocodeHelper {
  static async getAddressFromCoordinates(
    lat: number,
    lng: number
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await response.json();
      return data.display_name || null;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return null;
    }
  }
}

export default GeocodeHelper;
