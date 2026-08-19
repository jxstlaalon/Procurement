import Modal from '../shared/Modal';
import { C, FONT_DISPLAY } from '../shared/theme';
import ItemForm from './ItemForm';

export default function ItemModal({ item, categories, units, onSave, onCancel }) {
  return (
    <Modal onClose={onCancel} maxWidth={500}>
      <h3 style={{ margin: '0 0 16px', fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 500, color: C.ink }}>
        {item ? 'Edit Item' : 'Add Item'}
      </h3>
      <ItemForm item={item} categories={categories} units={units} onSave={onSave} onCancel={onCancel} />
    </Modal>
  );
}
