import React, { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";


/* ================= OPTION TYPES ================= */

const TYPES = {
    OK: ["OK", "NOT OK"],
    YESNO: ["YES", "NO"],
    DONE: ["DONE", "NOT DONE"],
    CLOSED: ["OPEN", "CLOSED"],
    NA: ["NA", "OK"]
};

/* ================= BASE STRUCTURE ================= */

const baseSections = {
    "INTERNAL MOTOR": [
        { name: "CARBON BRUSH", type: "OK" },
        { name: "HOLDER", type: "OK" },
        { name: "COMMUTATOR", type: "OK" },
        { name: "NO. CARBON BUSH", type: "NA" },
        { name: "CORROSION", type: "YESNO" }
    ],
    CLEANING: [
        { name: "MOTOR", type: "DONE" },
        { name: "FILTER PAD", type: "DONE" },
        { name: "BLOWER", type: "DONE" },
        { name: "CARBON CONSUMPTION", type: "YESNO" },
        { name: "HOLDER CONSUMPTION", type: "YESNO" }
    ],
    CONNECTION: [
        { name: "ARMATURE", type: "OK" },
        { name: "FIELD", type: "OK" },
        { name: "BLOWER", type: "OK" },
        { name: "ENCODER", type: "OK" },
        { name: "PANEL 24 V DC", type: "OK" }
    ],
    MOUNTING: [
        { name: "DRIVE SIDE", type: "OK" },
        { name: "NON DRIVE SIDE", type: "OK" },
        { name: "FOUNDATION", type: "OK" },
        { name: "NUT BOLT", type: "OK" }
    ],
    COOLING: [
        { name: "FRONT COVER", type: "CLOSED" },
        { name: "BACK COVER", type: "CLOSED" },
        { name: "DRIVE PANEL", type: "CLOSED" }
    ]
};

/* ================= COMPLETE BLOCK CONFIG ================= */

const blockConfig = {

    "ROUGHING MOTOR": {
        "INTERNAL MOTOR": [
            { name: "CARBON BRUSH", type: "OK" },
            { name: "HOLDER", type: "OK" },
            { name: "STATOR", type: "OK" }
        ],
        CLEANING: [{ name: "MOTOR", type: "DONE" }],
        CONNECTION: [
            { name: "STATOR", type: "OK" },
            { name: "ROTOR", type: "OK" },
            { name: "JUNCTION BOX", type: "OK" }
        ]
    },

    "STAND - C1": baseSections,
    "STAND - C2": baseSections,
    "STAND - C3": baseSections,
    "STAND - C4": baseSections,
    "STAND - C5": baseSections,
    "STAND - C6": baseSections,
    "STAND - C7": baseSections,
    "STAND - C8": baseSections,
    "STAND - C9": baseSections,
    "STAND - C10": baseSections,

    "CCS - 1": {
        ...baseSections,
        CONNECTION: [...baseSections.CONNECTION, { name: "PROXY", type: "OK" }]
    },

    "CCS - 2": {
        ...baseSections,
        CONNECTION: [...baseSections.CONNECTION, { name: "PROXY", type: "OK" }]
    },

    "PRE PINCH": {
        ...baseSections,
        CONNECTION: [
            ...baseSections.CONNECTION,
            { name: "HMD", type: "OK" },
            { name: "SOLENOID COIL", type: "OK" }
        ]
    },

    "POST PINCH": {
        ...baseSections,
        CONNECTION: [
            ...baseSections.CONNECTION,
            { name: "SOLENOID COIL", type: "OK" }
        ]
    },

    "CRANK + FLY SHEAR": {
        ...baseSections,
        CONNECTION: [...baseSections.CONNECTION, { name: "PROXY", type: "OK" }]
    },

    "TB-1 MOTOR": {
        ...baseSections,
        CONNECTION: [...baseSections.CONNECTION, { name: "SOLENOID COIL", type: "OK" }]
    },

    "TB-2 MOTOR": {
        ...baseSections,
        CONNECTION: [...baseSections.CONNECTION, { name: "SOLENOID COIL", type: "OK" }]
    },

    "RAKE-1": {
        ...baseSections,
        CONNECTION: [...baseSections.CONNECTION, { name: "PROXY", type: "OK" }]
    },

    "RAKE-2": {
        ...baseSections,
        CONNECTION: [
            ...baseSections.CONNECTION,
            { name: "SOLENOID COIL", type: "OK" },
            { name: "PROXY", type: "OK" }
        ]
    }
};

/* ================= COMPONENT ================= */

const DcMotorForm = () => {
    const [header, setHeader] = useState({
        date: new Date().toISOString().split("T")[0],
        shift: "DAY",
        heatStart: "",
        heatEnd: "",
        remarks: ""
    });

    const [openBlock, setOpenBlock] = useState(null);
    const [data, setData] = useState({});

    const handleChange = (block, section, param, value) => {
        setData(prev => ({
            ...prev,
            [block]: {
                ...prev[block],
                [section]: {
                    ...prev[block]?.[section],
                    [param]: value
                }
            }
        }));
    };

    const validateForm = () => {
        const today = new Date().toISOString().split("T")[0];

        if (!header.date || header.date > today) {
            alert("Invalid Date. Future date not allowed.");
            return false;
        }

        if (!header.shift) {
            alert("Shift is required.");
            return false;
        }

        if (!header.heatStart) {
            alert("Heat Over Start Time is required.");
            return false;
        }

        if (!header.heatEnd) {
            alert("Heat Over End Time is required.");
            return false;
        }

        if (!header.remarks || header.remarks.trim() === "") {
            alert("Remarks are compulsory.");
            return false;
        }

        // At least one section filled
        let anySectionFilled = false;

        for (const block of Object.values(data)) {
            for (const section of Object.values(block)) {
                for (const value of Object.values(section)) {
                    if (value && value !== "") {
                        anySectionFilled = true;
                    }
                }
            }
        }

        if (!anySectionFilled) {
            alert("At least one machine section must be filled.");
            return false;
        }

        return true;
    };

    // import jsPDF from "jspdf";

    const generatePDF = () => {
        const doc = new jsPDF("p", "mm", "a4");

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const margin = 10;
        let y = 15;

        /* ================= HEADER ================= */

        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.text("DC MOTOR MAINTENANCE AND CHECKLIST", pageWidth / 2, y, {
            align: "center",
        });

        y += 8;

        doc.setFontSize(9);
        doc.setFont(undefined, "normal");

        doc.text(
            `HEAT OVER TIME: ${header.heatStart} TO ${header.heatEnd} (${header.shift})`,
            margin,
            y
        );

        doc.text(`DATE: ${header.date}`, pageWidth - margin, y, {
            align: "right",
        });

        y += 10;

        /* ================= BLOCK LOOP ================= */

        Object.keys(data).forEach((block) => {
            const blockData = data[block];

            if (!blockData) return;

            // Page break
            if (y > pageHeight - 40) {
                doc.addPage();
                y = 15;
            }

            doc.setFontSize(10);
            doc.setFont(undefined, "bold");
            doc.text(block, margin, y);

            y += 5;

            const sections = Object.keys(blockData);
            const sectionCount = sections.length;

            const availableWidth = pageWidth - margin * 2;
            const sectionWidth = availableWidth / sectionCount;

            let maxRows = 0;

            sections.forEach((sec) => {
                maxRows = Math.max(
                    maxRows,
                    Object.keys(blockData[sec]).length
                );
            });

            /* ================= HEADER ROW ================= */

            doc.setFontSize(7);
            doc.setFont(undefined, "bold");

            sections.forEach((sectionName, index) => {
                const x = margin + index * sectionWidth;

                doc.setFillColor(255, 255, 0);
                doc.rect(x, y, sectionWidth * 0.7, 6, "FD");
                doc.rect(x + sectionWidth * 0.7, y, sectionWidth * 0.3, 6, "FD");

                doc.setTextColor(0, 0, 0);

                doc.text(sectionName, x + 2, y + 4);
                doc.text("STATUS", x + sectionWidth * 0.7 + 2, y + 4);
            });

            y += 6;

            /* ================= DATA ROWS ================= */

            const paddingX = 2;
            const paddingY = 1.5;
            const minRowHeight = 6;
            const lineHeight = 3;

            for (let i = 0; i < maxRows; i++) {
                let rowHeights = [];

                sections.forEach((sectionName) => {
                    const entries = Object.entries(blockData[sectionName]);
                    const entry = entries[i];

                    if (!entry) {
                        rowHeights.push(minRowHeight);
                        return;
                    }

                    const [param, value] = entry;

                    const partWidth = sectionWidth * 0.7;
                    const statusWidth = sectionWidth * 0.3;

                    const textLines = doc.splitTextToSize(
                        param,
                        partWidth - paddingX * 2
                    );

                    const valueLines = doc.splitTextToSize(
                        value,
                        statusWidth - paddingX * 2
                    );

                    const contentHeight =
                        Math.max(
                            textLines.length,
                            valueLines.length
                        ) * lineHeight;

                    rowHeights.push(
                        Math.max(minRowHeight, contentHeight + paddingY * 2)
                    );
                });

                const rowHeight = Math.max(...rowHeights);

                // eslint-disable-next-line no-loop-func
                sections.forEach((sectionName, index) => {
                    const x = margin + index * sectionWidth;

                    const entries = Object.entries(blockData[sectionName]);
                    const entry = entries[i];

                    const partWidth = sectionWidth * 0.7;
                    const statusWidth = sectionWidth * 0.3;

                    doc.rect(x, y, partWidth, rowHeight);
                    doc.rect(x + partWidth, y, statusWidth, rowHeight);

                    if (!entry) return;

                    const [param, value] = entry;

                    doc.setFontSize(6.5);
                    doc.setFont(undefined, "normal");

                    const textLines = doc.splitTextToSize(
                        param,
                        partWidth - paddingX * 2
                    );

                    const valueLines = doc.splitTextToSize(
                        value,
                        statusWidth - paddingX * 2
                    );

                    doc.text(
                        textLines,
                        x + paddingX,
                        y + paddingY + lineHeight - 1
                    );

                    doc.text(
                        valueLines,
                        x + partWidth + paddingX,
                        y + paddingY + lineHeight - 1
                    );
                });

                y += rowHeight;
            }

            y += 6;
        });

        /* ================= REMARKS ================= */

        if (y > pageHeight - 30) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(9);
        doc.setFont(undefined, "bold");
        doc.text("REMARKS:", margin, y);

        y += 5;

        doc.setFont(undefined, "normal");
        doc.setFontSize(8);

        const remarksLines = doc.splitTextToSize(
            header.remarks,
            pageWidth - margin * 2
        );

        doc.text(remarksLines, margin, y);

        /* ================= SAVE ================= */

        doc.save(`HBM_DC_MOTOR_${header.date}.pdf`);
    };


    const handleSubmit = () => {
        if (!validateForm()) return;

        console.log("HEADER:", header);
        console.log("BLOCK DATA:", data);

        alert("Checksheet Saved Successfully");
        generatePDF();
    };


    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-6xl mx-auto bg-white p-6 rounded-xl shadow">

                <h1 className="text-2xl font-bold mb-6">
                    HBM DC MOTOR MAINTENANCE
                </h1>

                {/* HEADER */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-gray-50 p-4 rounded-lg border">
                    <label className="block text-sm font-semibold mb-1">DATE</label>
                    <input
                        type="date"
                        max={new Date().toISOString().split("T")[0]}
                        value={header.date}
                        onChange={(e) => setHeader({ ...header, date: e.target.value })}
                        className="w-full border px-3 py-2 rounded"
                    />

                    <label className="block text-sm font-semibold mb-1">SHIFT</label>
                    <select
                        value={header.shift}
                        onChange={(e) => setHeader({ ...header, shift: e.target.value })}
                        className="border px-3 py-2 rounded"
                    >
                        <option value="DAY">DAY</option>
                        <option value="NIGHT">NIGHT</option>
                    </select>
                    <label className="block text-sm font-semibold mb-1">HEAT OVER START TIME</label>
                    <input
                        type="time"
                        value={header.heatStart}
                        onChange={(e) => setHeader({ ...header, heatStart: e.target.value })}
                        className="border px-3 py-2 rounded"
                    />
                    <label className="block text-sm font-semibold mb-1">HEAT OVER END TIME</label>
                    <input
                        type="time"
                        value={header.heatEnd}
                        onChange={(e) => setHeader({ ...header, heatEnd: e.target.value })}
                        className="border px-3 py-2 rounded"
                    />
                </div>

                {/* BLOCKS */}
                {Object.keys(blockConfig).map(block => (
                    <div key={block} className="border rounded-lg mb-4">

                        <div
                            onClick={() => setOpenBlock(openBlock === block ? null : block)}
                            className="cursor-pointer px-4 py-3 bg-emerald-600 text-white font-semibold flex justify-between"
                        >
                            {block}
                            <span>{openBlock === block ? "−" : "+"}</span>
                        </div>

                        {openBlock === block && (
                            <div className="p-4 bg-gray-50">

                                {Object.entries(blockConfig[block]).map(([section, params]) => (
                                    <div key={section} className="mb-5">

                                        <h3 className="font-bold text-emerald-700 mb-3 border-b pb-1">
                                            {section}
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {params.map(param => (
                                                <div key={param.name} className="flex justify-between items-center bg-white p-2 rounded border">

                                                    <label className="text-sm font-medium">
                                                        {param.name}
                                                    </label>

                                                    <select
                                                        value={data?.[block]?.[section]?.[param.name] || ""}
                                                        onChange={(e) =>
                                                            handleChange(block, section, param.name, e.target.value)
                                                        }
                                                        className="border rounded px-2 py-1 text-sm"
                                                    >
                                                        <option value="">-- Select --</option>
                                                        {TYPES[param.type].map(opt => (
                                                            <option key={opt}>{opt}</option>
                                                        ))}
                                                    </select>

                                                </div>
                                            ))}
                                        </div>

                                    </div>
                                ))}

                            </div>
                        )}

                    </div>
                ))}

                {/* REMARKS */}
                <textarea
                    rows="4"
                    value={header.remarks}
                    onChange={(e) => setHeader({ ...header, remarks: e.target.value })}
                    className="w-full border px-3 py-2 rounded mt-6"
                    placeholder="Remarks..."
                />


                <button
                    onClick={handleSubmit}
                    className="w-full mt-6 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700"
                >
                    Save Checksheet
                </button>


            </div>
        </div>
    );
};

export default DcMotorForm;
