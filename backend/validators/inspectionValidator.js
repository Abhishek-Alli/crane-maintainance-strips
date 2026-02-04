const { body, param, query, validationResult } = require('express-validator');
const InspectionConfigModel = require('../models/InspectionConfig');
const CraneModel = require('../models/Crane');
const InspectionModel = require('../models/Inspection');

/**
 * Validation middleware wrapper
 */
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  };
};

/**
 * Custom validator: Check if section has any field filled
 */
const validateSectionCompleteness = async (req, res, next) => {
  const { sections } = req.body;

  try {
    // Get all sections with their items configuration
    const sectionsConfig = await InspectionConfigModel.getSectionsWithItems();
    const sectionConfigMap = {};
    sectionsConfig.forEach(sec => {
      sectionConfigMap[sec.id] = sec;
    });

    for (const section of sections) {
      const sectionConfig = sectionConfigMap[section.section_id];
      if (!sectionConfig) continue;

      // Check if any item in this section has a value
      const hasAnyValue = section.items.some(item => item.selected_value);

      if (hasAnyValue) {
        // If any field is filled, check all COMPULSORY fields
        const compulsoryItems = sectionConfig.items.filter(
          item => item.compulsory === 'COMPULSORY'
        );

        for (const compulsoryItem of compulsoryItems) {
          const submittedItem = section.items.find(
            item => item.item_id === compulsoryItem.id
          );

          if (!submittedItem || !submittedItem.selected_value) {
            return res.status(400).json({
              success: false,
              message: `Section "${sectionConfig.name}" has values but missing compulsory field: "${compulsoryItem.item_name}"`,
              field: compulsoryItem.item_name,
              section: sectionConfig.name
            });
          }
        }
      }
    }

    next();
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Validation failed',
      error: error.message
    });
  }
};

/**
 * Custom validator: Check dropdown values
 */
const validateDropdownValues = async (req, res, next) => {
  const { sections } = req.body;

  try {
    const sectionsConfig = await InspectionConfigModel.getSectionsWithItems();
    const itemConfigMap = {};
    sectionsConfig.forEach(sec => {
      sec.items.forEach(item => {
        itemConfigMap[item.id] = item;
      });
    });

    for (const section of sections) {
      for (const item of section.items) {
        if (item.selected_value) {
          const itemConfig = itemConfigMap[item.item_id];
          if (!itemConfig) {
            return res.status(400).json({
              success: false,
              message: `Invalid item ID: ${item.item_id}`
            });
          }

          // Check if selected value is in allowed dropdown values
          if (!itemConfig.dropdown_values.includes(item.selected_value)) {
            return res.status(400).json({
              success: false,
              message: `Invalid value "${item.selected_value}" for item "${itemConfig.item_name}". Allowed values: ${itemConfig.dropdown_values.join(', ')}`,
              field: itemConfig.item_name,
              section: section.section_id
            });
          }
        }
      }
    }

    next();
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Validation failed',
      error: error.message
    });
  }
};

/**
 * Custom validator: Check duplicate inspection
 */
const validateDuplicateInspection = async (req, res, next) => {
  const { crane_id, inspection_date } = req.body;

  try {
    const exists = await InspectionModel.existsForCraneOnDate(crane_id, inspection_date);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Inspection already exists for this crane on ${inspection_date}. Only one inspection per crane per day is allowed.`
      });
    }
    next();
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Validation failed',
      error: error.message
    });
  }
};

/**
 * Inspection creation validation rules
 */
const createInspectionValidation = [
  // Header fields (ALL COMPULSORY)
  body('inspection_date')
    .notEmpty()
    .withMessage('Date is required')
    .isDate()
    .withMessage('Invalid date format'),

  body('recorded_by')
    .notEmpty()
    .withMessage('Recorded By is required')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Recorded By must be between 2 and 200 characters'),

  body('shed_id')
    .notEmpty()
    .withMessage('Shed is required')
    .isInt()
    .withMessage('Invalid shed ID'),

  body('crane_id')
    .notEmpty()
    .withMessage('Crane No is required')
    .isInt()
    .withMessage('Invalid crane ID'),

  // Optional fields
  body('maintenance_start_time')
    .optional()
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format. Use HH:MM'),

  body('maintenance_stop_time')
    .optional()
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format. Use HH:MM'),

  body('remarks')
    .optional()
    .trim(),

  // Sections
  body('sections')
    .isArray({ min: 1 })
    .withMessage('At least one section must be provided'),

  body('sections.*.section_id')
    .isInt()
    .withMessage('Invalid section ID'),

  body('sections.*.items')
    .isArray()
    .withMessage('Items must be an array'),

  body('sections.*.items.*.item_id')
    .isInt()
    .withMessage('Invalid item ID'),

  body('sections.*.items.*.selected_value')
    .optional()
    .trim(),

  body('sections.*.items.*.remarks')
    .optional()
    .trim()
];

/**
 * Get inspections validation
 */
const getInspectionsValidation = [
  query('crane_id').optional().isInt().withMessage('Invalid crane ID'),
  query('shed_id').optional().isInt().withMessage('Invalid shed ID'),
  query('from_date').optional().isDate().withMessage('Invalid from_date format'),
  query('to_date').optional().isDate().withMessage('Invalid to_date format'),
  query('has_alerts').optional().isBoolean().withMessage('has_alerts must be boolean')
];

/**
 * ID parameter validation
 */
const idParamValidation = [
  param('id').isInt().withMessage('Invalid ID')
];

module.exports = {
  validate,
  createInspectionValidation,
  validateSectionCompleteness,
  validateDropdownValues,
  validateDuplicateInspection,
  getInspectionsValidation,
  idParamValidation
};
