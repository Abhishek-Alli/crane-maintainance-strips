import React, { useEffect, useState } from "react";
import { pumpHouseAPI } from "../../services/api";

const PumpHouseForm = () => {

  const [formData, setFormData] = useState({
    date: "",
    location: "",
    description: "",
    status: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await pumpHouseAPI.create(formData);
      alert("Saved successfully");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Pump House Entry</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
        />

        <input
          type="text"
          name="location"
          placeholder="Location"
          value={formData.location}
          onChange={handleChange}
        />

        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
        />

        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="">Select Status</option>
          <option>Pending</option>
          <option>Completed</option>
        </select>

        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default PumpHouseForm;
