CREATE TABLE IF NOT EXISTS fabrication_sheets (
    id SERIAL PRIMARY KEY,
    sheet_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fabrication_reports (
    id SERIAL PRIMARY KEY,

    sheet_id INTEGER NOT NULL
    REFERENCES fabrication_sheets(id)
    ON DELETE CASCADE,

    report_date DATE NOT NULL,
    location VARCHAR(150) NOT NULL,
    work_description TEXT NOT NULL,
    contractor_name VARCHAR(150),
    work_given TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    instructed_by VARCHAR(150),
    note TEXT,

    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
