// InspectionForm.jsx
import { inspectionSectionAPI, inspectionItemAPI } from '../services/api';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-toastify';

import {
  configAPI,
  craneAPI,
  inspectionAPI,
  formAPI

} from '../services/api';

// eslint-disable-next-line no-unused-vars
import {
  getWindowWarningMessage,
  resolveDepartmentByDate,
  DEPARTMENT_COLORS
} from '../utils/maintenanceSchedule';

const InspectionForm = ({ onSuccess }) => {
  const user = JSON.parse(localStorage.getItem('user'));

  /* =============================
     FORM
  ============================= */
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue
  } = useForm({
    defaultValues: {
      inspection_date: new Date(),
      department_id: '',
      shed_id: '',
      crane_id: '',
      form_id: ''
    }
  });

  /* =============================
     STATE
  ============================= */
  const [departments, setDepartments] = useState([]);
  const [sheds, setSheds] = useState([]);
  const [cranes, setCranes] = useState([]);
  const [forms, setForms] = useState([]);
  const [sections, setSections] = useState([]);
  const [sectionValues, setSectionValues] = useState({});
  
  const [loading, setLoading] = useState(false);
  

  const selectedDepartmentId = watch('department_id');
  const selectedShedId = watch('shed_id');
  const selectedCraneId = watch('crane_id');


  /* =============================
     INITIAL LOAD
  ============================= */
  useEffect(() => {
    loadDepartments();
    loadForms();
  }, []);

  /* =============================
     LOAD SHEDS
  ============================= */
  useEffect(() => {
    if (!selectedDepartmentId) {
      setSheds([]);
      setCranes([]);
      return;
    }
    loadSheds(selectedDepartmentId);
    setValue('shed_id', '');
    setValue('crane_id', '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartmentId]);

  /* =============================
     LOAD CRANES
  ============================= */
  useEffect(() => {
    if (!selectedShedId) {
      setCranes([]);
      return;
    }
    loadCranes(selectedShedId);
    setValue('crane_id', '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShedId]);

  /* =============================
     LOAD SECTIONS (AUTO FORM)
  ============================= */

  const loadSections = async (formId) => {
  try {
    const sectionRes = await inspectionSectionAPI.getByForm(formId);
    const sectionList = sectionRes.data || sectionRes;

    const values = {};
    const expanded = {};

    const sectionsWithItems = await Promise.all(
      sectionList.map(async (section, index) => {
        const itemRes = await inspectionItemAPI.getBySection(section.id);
        const items = itemRes.data || itemRes;

        values[section.id] = {};
        expanded[section.id] = index === 0;

        items.forEach(item => {
          values[section.id][item.id] = {
            selected_value: '',
            remarks: ''
          };
        });

        return { ...section, items };
      })
    );

    setSections(sectionsWithItems);
    setSectionValues(values);
   
  } catch (err) {
    console.error(err);
    toast.error('Failed to load inspection sections');
  }
};

  useEffect(() => {
    if (!selectedCraneId || forms.length === 0) {
      setSections([]);
      return;
    }

    const formId = forms[0].id;
    setValue('form_id', String(formId));
    loadSections(formId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCraneId, forms]);

  /* =============================
     API LOADERS
  ============================= */
  const loadDepartments = async () => {
    try {
      const res = await configAPI.getDepartments();
      setDepartments(res.data || []);
    } catch {
      toast.error('Failed to load departments');
    }
  };

  const loadSheds = async (departmentId) => {
    try {
      const res = await configAPI.getSheds({ department_id: departmentId });
      setSheds(res.data || []);
    } catch {
      toast.error('Failed to load sheds');
    }
  };

  const loadCranes = async (shedId) => {
    try {
      const res = await craneAPI.getByShed(shedId);
      setCranes(res.data || []);
    } catch {
      toast.error('Failed to load cranes');
    }
  };

  const loadForms = async () => {
    try {
      const res = await formAPI.getAll();
      const data = Array.isArray(res) ? res : res.data || [];
      setForms(data);
    } catch {
      toast.error('Failed to load forms');
    }
  };




  /* =============================
     HELPERS
  ============================= */
  
  const normalizeValue = (value) => {
    if (!value) return value;
    return value.replace(' ', '_').toUpperCase();
  };

  const handleItemChange = (sid, iid, key, value) => {
    setSectionValues(prev => ({
      ...prev,
      [sid]: {
        ...prev[sid],
        [iid]: {
          ...prev[sid][iid],
          [key]: key === 'selected_value'
            ? normalizeValue(value)
            : value
        }
      }
    }));
  };

  /* =============================
     SUBMIT
  ============================= */
  const onSubmit = async (data) => {
    if (!user?.id) {
      toast.error('User not logged in');
      return;
    }

    // 0. Validate required dropdowns
    if (!data.department_id || !data.shed_id || !data.crane_id) {
      toast.error('Please select Department, Shed, and Crane');
      return;
    }

    // 1. Validate NOT OK remarks
    const notOkWithoutRemarks = [];

    sections.forEach(section => {
      section.items.forEach(item => {
        const v = sectionValues?.[section.id]?.[item.id];
        if (v?.selected_value === 'NOT_OK' && !v?.remarks?.trim()) {
          notOkWithoutRemarks.push(`${section.name} - ${item.field_name}`);
        }
      });
    });

    if (notOkWithoutRemarks.length > 0) {
      toast.error(`Remarks required for NOT OK items`);
      return;
    }

    // 2. Build payload items
    // 2. Build payload items (SOURCE OF TRUTH = sectionValues)
    const items = [];

Object.entries(sectionValues).forEach(([sectionId, itemMap]) => {
  Object.entries(itemMap).forEach(([itemId, value]) => {
    if (value.selected_value === 'OK' || value.selected_value === 'NOT_OK') {
      items.push({
        section_id: Number(sectionId),
        item_id: Number(itemId),
        status: value.selected_value,          // BACKEND EXPECTS THIS
        remarks: value.remarks?.trim() || ''   // NEVER SEND NULL
      });
    }
  });
});

// At least ONE item required
if (items.length === 0) {
  toast.error('Fill at least one inspection item');
  return;
}

const payload = {
  inspection_date: new Date(data.inspection_date)
    .toISOString()
    .split('T')[0],
  department_id: Number(data.department_id),
  shed_id: Number(data.shed_id),
  crane_id: Number(data.crane_id),
  recorded_by: user.id,
  items
};


    setLoading(true);
    try {
      console.log('FINAL PAYLOAD SENT:', JSON.stringify(payload, null, 2));

      await inspectionAPI.create(payload);
      toast.success('Inspection submitted successfully');
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error('Submission failed');
    } finally {
      setLoading(false);
    }
  };

  /* =============================
     RENDER
  ============================= */
  return (
    <div className="min-h-screen bg-gray-100 pb-28">
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">

        <div className="bg-white p-4 rounded shadow space-y-3">
          <Controller
            name="inspection_date"
            control={control}
            render={({ field }) => (
              <DatePicker {...field} className="w-full border p-2 rounded" />
            )}
          />

          <select {...register('department_id')} className="w-full p-2 border rounded">
            <option value="">Select Department</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select {...register('shed_id')} className="w-full p-2 border rounded">
            <option value="">Select Shed</option>
            {sheds.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select {...register('crane_id')} className="w-full p-2 border rounded">
            <option value="">Select Crane</option>
            {cranes.map(c => (
              <option key={c.id} value={c.id}>{c.crane_number}</option>
            ))}
          </select>
        </div>

        {sections.map(section => (
          <div key={section.id} className="bg-white rounded shadow mb-3">
            <div className="p-3 font-bold border-b">
              {section.name}
            </div>

            <div className="p-4 space-y-4">
              {section.items.map(item => (
                <div key={item.id}>
                  <p className="font-medium">{item.field_name}</p>

                  <div className="flex mt-2 border rounded overflow-hidden w-fit">
                    <button
                      type="button"
                      onClick={() =>
                        handleItemChange(section.id, item.id, 'selected_value', 'OK')
                      }
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                        sectionValues?.[section.id]?.[item.id]?.selected_value === 'OK'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleItemChange(section.id, item.id, 'selected_value', 'NOT OK')
                      }
                      className={`px-4 py-1.5 text-sm font-medium border-l transition-colors ${
                        sectionValues?.[section.id]?.[item.id]?.selected_value === 'NOT_OK'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      NOT OK
                    </button>
                  </div>

                  {sectionValues?.[section.id]?.[item.id]?.selected_value === 'NOT_OK' && (
                    <textarea
                      className="w-full mt-2 p-2 border rounded"
                      placeholder="Enter remarks (required for NOT OK)"
                      value={sectionValues[section.id][item.id].remarks || ''}
                      onChange={(e) =>
                        handleItemChange(section.id, item.id, 'remarks', e.target.value)
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4"
        >
          {loading ? 'Submitting...' : 'Submit Inspection'}
        </button>

      </form>
    </div>
  );
};

export default InspectionForm;
