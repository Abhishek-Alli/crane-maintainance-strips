import React, { useEffect, useState } from "react";
import { pumpHouseAPI } from "../../services/api";

const PumpHouseForm = () => {
  const [locations, setLocations] = useState([]);
  const [readings, setReadings] = useState({});
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // LOAD LOCATIONS ON MOUNT
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const data = await pumpHouseAPI.getLocations();
      console.log("LOCATIONS RECEIVED:", data);
      setLocations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setLocations([]);
    }
  };

  // HANDLE INPUT CHANGE
  const handleChange = (locationId, field, value) => {
    setReadings((prev) => ({
      ...prev,
      [locationId]: {
        ...prev[locationId],
        [field]: value,
      },
    }));
  };

  // SAVE DATA
  const handleSubmit = async () => {
  try {
    const formattedReadings = locations.map(loc => ({
      location_id: loc.id,
      tds: formData[loc.id]?.tds || null,
      hardness: formData[loc.id]?.hardness || null,
      ph: formData[loc.id]?.ph || null,
      temp: formData[loc.id]?.temp || null
    }));

    const response = await pumpHouseAPI.saveWithPDF({
      date,
      readings: formattedReadings
    });

    const url = window.URL.createObjectURL(
      new Blob([response.data])
    );

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `PUMP_HOUSE_${date}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    alert("Saved & PDF Downloaded");

  } catch (err) {
    console.error(err);
    alert("Save failed");
  }
};

  return (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">
        PUMP HOUSE WATER PARAMETERS
      </h2>

      <input
        type="date"
        max={new Date().toISOString().split("T")[0]}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="border p-2 mb-4"
      />

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs md:text-sm">
          <thead>
            <tr className="bg-yellow-400 text-black">
              <th className="border px-2 py-2">Location</th>
              <th className="border px-2 py-2">TDS</th>
              <th className="border px-2 py-2">Hardness</th>
              <th className="border px-2 py-2">PH</th>
              <th className="border px-2 py-2">Temp</th>
            </tr>
          </thead>

          <tbody>
            {locations.map((loc) => (
              <tr key={loc.id} className="text-center">
                <td className="border px-2 py-2 text-left">
                  {loc.location_name}
                </td>

                <td className="border px-1 py-1">
                  <input
                    type="number"
                    className="w-full border rounded px-1 py-1"
                    onChange={(e) =>
                      handleChange(loc.id, "tds", e.target.value)
                    }
                  />
                </td>

                <td className="border px-1 py-1">
                  <input
                    type="number"
                    className="w-full border rounded px-1 py-1"
                    onChange={(e) =>
                      handleChange(loc.id, "hardness", e.target.value)
                    }
                  />
                </td>

                <td className="border px-1 py-1">
                  <input
                    type="number"
                    step="0.1"
                    className="w-full border rounded px-1 py-1"
                    onChange={(e) =>
                      handleChange(loc.id, "ph", e.target.value)
                    }
                  />
                </td>

                <td className="border px-1 py-1">
                  <input
                    type="number"
                    step="0.1"
                    className="w-full border rounded px-1 py-1"
                    onChange={(e) =>
                      handleChange(loc.id, "temp", e.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSubmit}
        className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded"
      >
        Save Daily Sheet
      </button>
    </div>
  );
};

export default PumpHouseForm;
