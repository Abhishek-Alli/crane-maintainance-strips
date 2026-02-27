import React, { useEffect, useState } from "react";
import axios from "axios";


const FabricationReport = () => {
    const [reportDate, setReportDate] = useState("");
    const [entries, setEntries] = useState([
        {
            location: "",
            work_description: "",
            contractor_name: "",
            work_given: "",
            status: "Pending",
            instructed_by: "",
            note: ""
        }
    ]);

    const [reports, setReports] = useState([]);
    const [filterType, setFilterType] = useState("daily");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");

    const token = localStorage.getItem("token");

    // Fetch reports
    const fetchReports = async () => {
        try {
            const res = await axios.get("/api/fabrication-report", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReports(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    // Handle change
    const handleChange = (index, e) => {
        const updated = [...entries];
        updated[index][e.target.name] = e.target.value;
        setEntries(updated);
    };

    // Add row
    const addRow = () => {
        setEntries([
            ...entries,
            {
                location: "",
                work_description: "",
                contractor_name: "",
                work_given: "",
                status: "Pending",
                instructed_by: "",
                note: ""
            }
        ]);
    };

    // Remove row
    const removeRow = (index) => {
        setEntries(entries.filter((_, i) => i !== index));
    };

    // Submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            for (let entry of entries) {
                await axios.post(
                    "/api/fabrication-report",
                    { ...entry, report_date: reportDate },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            alert("Entries Saved");
            setEntries([{
                location: "",
                work_description: "",
                contractor_name: "",
                work_given: "",
                status: "Pending",
                instructed_by: "",
                note: ""
            }]);
            fetchReports();

        } catch (err) {
            console.error(err);
        }
    };

    const downloadPDF = async () => {
        try {
            let url = `/api/fabrication-report/pdf?type=${filterType}`;

            if (filterType === "custom") {
                url += `&startDate=${customStart}&endDate=${customEnd}`;
            }

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: "blob"
            });

            const blob = new Blob([res.data], { type: "application/pdf" });

            const link = document.createElement("a");
            link.href = window.URL.createObjectURL(blob);
            link.download = "fabrication-report.pdf";
            link.click();

        } catch (err) {
            console.error("PDF Download Error:", err);
        }
    };

    return (
        <div className="p-4 max-w-full overflow-x-auto">

            <h2 className="text-xl font-bold mb-4">Fabrication Daily Register</h2>

            {/* DATE */}
            <div className="mb-4">
                <label className="font-semibold mr-2">DATE:</label>
                <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    required
                    className="border p-2 rounded"
                />
            </div>

            {/* ENTRY TABLE */}
            <form onSubmit={handleSubmit}>

                <div className="overflow-x-auto">
                    <table className="min-w-[1000px] border text-sm">
                        <thead className="bg-gray-200 text-xs md:text-sm">
                            <tr>
                                <th className="border p-2">SR.NO</th>
                                <th className="border p-2">LOCATION</th>
                                <th className="border p-2">WORK DETAILS</th>
                                <th className="border p-2">CONTRACTOR NAME</th>
                                <th className="border p-2">WORK GIVEN</th>
                                <th className="border p-2">STATUS</th>
                                <th className="border p-2">INSTRUCTED BY</th>
                                <th className="border p-2">NOTE</th>
                                <th className="border p-2">ACTION</th>
                            </tr>
                        </thead>

                        <tbody>
                            {entries.map((entry, index) => (
                                <tr key={index}>
                                    <td className="border p-2 text-center">
                                        {index + 1}
                                    </td>

                                    <td className="border p-2">
                                        <input
                                            name="location"
                                            value={entry.location}
                                            onChange={(e) => handleChange(index, e)}
                                            placeholder="EXTENSION PTM SHED"
                                            className="w-full border p-1 rounded"
                                            required
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <input
                                            name="work_description"
                                            value={entry.work_description}
                                            onChange={(e) => handleChange(index, e)}
                                            placeholder="Column erection completed"
                                            className="w-full border p-1 rounded"
                                            required
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <input
                                            name="contractor_name"
                                            value={entry.contractor_name}
                                            onChange={(e) => handleChange(index, e)}
                                            placeholder="RAVI SIRSATH"
                                            className="w-full border p-1 rounded"
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <input
                                            name="work_given"
                                            value={entry.work_given}
                                            onChange={(e) => handleChange(index, e)}
                                            placeholder="KG / PER MTR"
                                            className="w-full border p-1 rounded"
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <select
                                            name="status"
                                            value={entry.status}
                                            onChange={(e) => handleChange(index, e)}
                                            className="w-full border p-1 rounded"
                                        >
                                            <option>Pending</option>
                                            <option>In Progress</option>
                                            <option>Completed</option>
                                            <option>Hold</option>
                                        </select>
                                    </td>

                                    <td className="border p-2">
                                        <input
                                            name="instructed_by"
                                            value={entry.instructed_by}
                                            onChange={(e) => handleChange(index, e)}
                                            placeholder="VINIT SIR"
                                            className="w-full border p-1 rounded"
                                        />
                                    </td>

                                    <td className="border p-2">
                                        <input
                                            name="note"
                                            value={entry.note}
                                            onChange={(e) => handleChange(index, e)}
                                            placeholder="Any remarks"
                                            className="w-full border p-1 rounded"
                                        />
                                    </td>

                                    <td className="border p-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(index)}
                                            className="text-red-600 text-xs"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Buttons */}
                <div className="mt-4 flex gap-3">
                    <button
                        type="button"
                        onClick={addRow}
                        className="bg-gray-600 text-white px-4 py-2 rounded"
                    >
                        + Add Row
                    </button>

                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-2 rounded"
                    >
                        Submit Entries
                    </button>
                </div>

            </form>

            {/* DATA VIEW TABLE */}
            <div className="mt-8 overflow-x-auto">
                <h3 className="font-semibold mb-2">Saved Entries</h3>
                <table className="min-w-full border text-sm">
                    <thead className="bg-gray-200">
                        <tr>
                            <th className="border p-2">Date</th>
                            <th className="border p-2">Location</th>
                            <th className="border p-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((r) => (
                            <tr key={r.id}>
                                <td className="border p-2">{r.report_date}</td>
                                <td className="border p-2">{r.location}</td>
                                <td className="border p-2">{r.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* DOWNLOAD REPORT SECTION */}
            <div className="mt-6 p-4 bg-gray-100 rounded">

                <h3 className="font-semibold mb-3">Download Report</h3>

                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border p-2 rounded mr-2"
                >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom</option>
                </select>

                {filterType === "custom" && (
                    <>
                        <input
                            type="date"
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="border p-2 rounded mr-2"
                        />
                        <input
                            type="date"
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="border p-2 rounded mr-2"
                        />
                    </>
                )}

                <button
                    onClick={downloadPDF}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                >
                    Download PDF
                </button>

            </div>

        </div>
    );
};

export default FabricationReport;
