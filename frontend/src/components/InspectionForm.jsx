// =============================
// PART 1 — IMPORTS + FORM + STATE
// =============================

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-toastify';

import {
  configAPI,
  craneAPI,
  inspectionAPI,
  inspectionSectionAPI,
  inspectionItemAPI
} from '../services/api';

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
      sub_department_id: '',
      shed_id: '',
      crane_id: '',
      form_id: ''
    }
  });

  /* =============================
     STATE
  ============================= */
  const [departments, setDepartments] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [sheds, setSheds] = useState([]);
  const [cranes, setCranes] = useState([]);

  const [sections, setSections] = useState([]);
  const [sectionValues, setSectionValues] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [remarks, setRemarks] = useState({});
  // const [actions, setActions] = useState({});

  const [loading, setLoading] = useState(false);

  const selectedDepartmentId = watch('department_id');
  const selectedSubDepartmentId = watch('sub_department_id');
  const selectedShedId = watch('shed_id');
  const selectedCraneId = watch('crane_id');

  // =============================
  // PART 2 — API LOADERS + EFFECTS
  // =============================

  const loadDepartments = async () => {
    try {
      const res = await configAPI.getDepartments();
      setDepartments(res.data || []);
    } catch {
      toast.error('Failed to load departments');
    }
  };

  const loadSubDepartments = async (departmentId) => {
    try {
      const res = await configAPI.getSubDepartments(departmentId);
      setSubDepartments(res.data || []);
    } catch {
      toast.error('Failed to load sub-departments');
    }
  };

  const loadSheds = async (params) => {
    try {
      const res = await configAPI.getSheds(params);
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

  // 🔥 FIXED: Stable callback
  const loadSectionsByMapping = useCallback(async () => {
    try {
      if (!selectedCraneId || !selectedSubDepartmentId) {
        setSections([]);
        return;
      }

      const subDeptId = Number(selectedSubDepartmentId);

      // Mechanical IDs = 1,2,3
      // Electrical IDs = 4,5,6
      const isElectrical = [4, 5, 6].includes(subDeptId);

      const formId = isElectrical ? 3 : 2;

      console.log("Using Form ID:", formId);

      const sectionRes = await inspectionSectionAPI.getByForm(formId);
      const sectionsData = sectionRes?.data || [];

      console.log("Sections Returned:", sectionsData);

      if (!sectionsData.length) {
        setSections([]);
        return;
      }

      const values = {};

      const sectionsWithItems = await Promise.all(
        sectionsData.map(async (section) => {
          const itemsRes = await inspectionItemAPI.getBySection(section.id);
          const items = itemsRes?.data || [];

          values[section.id] = {};

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
  }, [selectedCraneId, selectedSubDepartmentId]);

  // INITIAL LOAD
  useEffect(() => {
    loadDepartments();
  }, []);

  // LOAD SUB-DEPARTMENTS
  useEffect(() => {
    if (!selectedDepartmentId) {
      setSubDepartments([]);
      setSheds([]);
      setCranes([]);
      setValue('sub_department_id', '');
      setValue('shed_id', '');
      setValue('crane_id', '');
      return;
    }

    loadSubDepartments(selectedDepartmentId);
    setValue('sub_department_id', '');
    setSheds([]);
    setCranes([]);
    setValue('shed_id', '');
    setValue('crane_id', '');

  }, [selectedDepartmentId, setValue]);

  // LOAD SHEDS
  useEffect(() => {
    if (!selectedDepartmentId || !selectedSubDepartmentId) {
      setSheds([]);
      setCranes([]);
      setValue('shed_id', '');
      setValue('crane_id', '');
      return;
    }

    loadSheds({
      department_id: selectedDepartmentId,
      sub_department_id: selectedSubDepartmentId
    });

    setValue('shed_id', '');
    setCranes([]);
    setValue('crane_id', '');

  }, [selectedDepartmentId, selectedSubDepartmentId, setValue]);

  // LOAD CRANES
  useEffect(() => {
    if (!selectedShedId) {
      setCranes([]);
      setValue('crane_id', '');
      return;
    }

    loadCranes(selectedShedId);
    setValue('crane_id', '');

  }, [selectedShedId, setValue]);

  useEffect(() => {
    if (selectedCraneId && selectedSubDepartmentId) {
      loadSectionsByMapping();
    } else {
      setSections([]);
    }
  }, [selectedCraneId, selectedSubDepartmentId, loadSectionsByMapping]);

  /* =============================
   LOAD SECTIONS (FIXED)
============================= */

  // =============================
  // PART 3 — HELPERS + SUBMIT + RENDER
  // =============================

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

  const onSubmit = async (data) => {
    if (!user?.id) {
      toast.error('User not logged in');
      return;
    }

    if (!data.department_id || !data.shed_id || !data.crane_id) {
      toast.error('Please select Department, Shed, and Crane');
      return;
    }

    const items = [];

    Object.entries(sectionValues).forEach(([sectionId, itemMap]) => {
      Object.entries(itemMap).forEach(([itemId, value]) => {
        if (value.selected_value === 'OK' || value.selected_value === 'NOT_OK') {

          if (value.selected_value === 'NOT_OK') {

            if (!value.remarks?.trim()) {
              toast.error('Remark required for NOT OK item');
              return;
            }

            if (!value.action_taken?.trim()) {
              toast.error('Action taken required for NOT OK item');
              return;
            }
          }
          items.push({
            section_id: Number(sectionId),
            item_id: Number(itemId),
            status: value.selected_value,
            remarks: value.remarks?.trim() || '',
            action_taken: value.action_taken?.trim() || ''
          });
        }
      });
    });

    if (items.length === 0) {
      toast.error('Fill at least one inspection item');
      return;
    }

    const payload = {
      inspection_date: new Date(data.inspection_date)
        .toISOString()
        .split('T')[0],
      department_id: Number(data.department_id),
      sub_department_id: Number(data.sub_department_id),
      shed_id: Number(data.shed_id),
      crane_id: Number(data.crane_id),
      recorded_by: user.id,
      items
    };

    setLoading(true);

    try {
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

  return (
    <div className="min-h-screen bg-gray-100 pb-28 p-4 space-y-4">

      <div className="bg-white p-4 rounded shadow space-y-3">Select Date<br/>
              <Controller
          name="inspection_date"
          control={control}
          render={({ field }) => (
            <DatePicker
              selected={field.value}
              onChange={field.onChange}
              dateFormat="dd/MM/yyyy"
              className="w-full border p-2 rounded text-gray-900 bg-white"
            />
          )}
        />

        <select {...register('department_id')} className="w-full p-2 border rounded">
          <option value="">Select Department</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select {...register('sub_department_id')} className="w-full p-2 border rounded">
          <option value="">Select Sub Department</option>
          {subDepartments.map(sd => (
            <option key={sd.id} value={sd.id}>{sd.name}</option>
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
                    className={`px-4 py-1.5 text-sm font-medium ${sectionValues?.[section.id]?.[item.id]?.selected_value === 'OK'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                      }`}
                  >
                    OK
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleItemChange(section.id, item.id, 'selected_value', 'NOT OK')
                    }
                    className={`px-4 py-1.5 text-sm font-medium border-l ${sectionValues?.[section.id]?.[item.id]?.selected_value === 'NOT_OK'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                      }`}
                  >
                    NOT OK
                  </button>
                </div>

                {sectionValues?.[section.id]?.[item.id]?.selected_value === 'NOT_OK' && (
                  <>
                    {/* Remark */}
                    <textarea
                      className="w-full mt-2 p-2 border rounded"
                      placeholder="Enter remarks (Mandatory)"
                      value={sectionValues[section.id][item.id].remarks || ''}
                      onChange={(e) =>
                        handleItemChange(section.id, item.id, 'remarks', e.target.value)
                      }
                    />

                    {/* Action Taken */}
                    <textarea
                      className="w-full mt-2 p-2 border rounded"
                      placeholder="Action taken (Mandatory)"
                      value={sectionValues[section.id][item.id].action_taken || ''}
                      onChange={(e) =>
                        handleItemChange(section.id, item.id, 'action_taken', e.target.value)
                      }
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleSubmit(onSubmit)}
        disabled={loading}
        className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4"
      >
        {loading ? 'Submitting...' : 'Submit Inspection'}
      </button>

    </div>
  );
};

export default InspectionForm;