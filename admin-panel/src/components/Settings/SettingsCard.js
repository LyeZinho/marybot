import { useState } from 'react';
import { useForm } from 'react-hook-form';

export default function SettingsCard({ title, description, settings, onUpdate, fields }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: settings
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await onUpdate(data);
      setHasChanges(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    reset(settings);
    setHasChanges(false);
  };

  const renderField = (field) => {
    const commonProps = {
      ...register(field.name, field.validation),
      onChange: (e) => {
        const value = field.type === 'boolean' ? e.target.checked : e.target.value;
        setHasChanges(true);
        // Trigger default onChange
        register(field.name).onChange(e);
      }
    };

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            className={`input-field ${errors[field.name] ? 'border-red-300' : ''}`}
            placeholder={field.placeholder}
            {...commonProps}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            className={`input-field ${errors[field.name] ? 'border-red-300' : ''}`}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            {...commonProps}
          />
        );
      
      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              {...commonProps}
            />
            <label className="ml-2 text-sm text-gray-700">
              {field.description || 'Habilitar'}
            </label>
          </div>
        );
      
      case 'select':
        return (
          <select
            className={`input-field ${errors[field.name] ? 'border-red-300' : ''}`}
            {...commonProps}
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'textarea':
        return (
          <textarea
            rows={field.rows || 3}
            className={`input-field ${errors[field.name] ? 'border-red-300' : ''}`}
            placeholder={field.placeholder}
            {...commonProps}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field.name} className={field.type === 'boolean' ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              {renderField(field)}
              {errors[field.name] && (
                <p className="mt-1 text-sm text-red-600">
                  {errors[field.name].message}
                </p>
              )}
              {field.description && field.type !== 'boolean' && (
                <p className="mt-1 text-sm text-gray-500">
                  {field.description}
                </p>
              )}
            </div>
          ))}
        </div>

        {hasChanges && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-amber-600">
              Você tem alterações não salvas
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleReset}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner w-4 h-4 mr-2" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}