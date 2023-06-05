const Category = require("../models/Categoris");
const upload = require("../utils/cloudinary");
const Upload = require('../utils/multer');
const router = require("./UserRoute");


router.post('/add', Upload.single('picture'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!req.file || !req.body) {
      return res.status(400).json({ message: "Bad Request" });
    }
    const picture = await upload(req.file.path);
    const category = new Category({ name, picture });
    const savedCategory = await category.save();
    res.status(201).json({ success: true, _id: savedCategory._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Request failed' });
  }
}
)

router.post('/addsubcategory/:categoryId', Upload.single('picture'), async (req, res) => {
  const { name } = req.body;
  const { categoryId } = req.params;
  try {
    let picture = '';
    if (req.file) {
      picture = await upload(req.file.path);
    }
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json('Category not found');
    }

    const subcategory = {
      _id: new mongoose.Types.ObjectId(),
      name,
      picture: picture,
    };
    category.subcategories.push(subcategory);
    await category.save();
    return res.status(201).json({ subcategory: subcategory });
  } catch (error) {
    console.error(error);
    return res.status(500).json('Request failed');
  }
}
)

router.get("/getall", async (req, res) => {
  try {
    const categories = await Category.find().populate('subcategories');
    console.log('list retrieved !');
    console.log(categories);
    return res.status(200).json({ category: categories });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error });
  }
}
)

router.patch("/edit/:id", Upload.single('picture'), async (req, res) => {
  const id = req.params.id;
  const { name } = req.body;

  try {
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).send('Category not found');
    }
    if (name) {
      category.name = name;
    }
    if (req.file) {
      const picture = await upload(req.file.path);
      category.picture = picture;
    }
    await category.save();
    console.log('done editing category !!');
    return res.status(200).json('Category updated successfully');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Request failed');
  }
}
)

router.patch("/editsub/:categoryId/:subcategoryId", Upload.single('picture'), async (req, res) => {
  const { categoryId, subcategoryId } = req.params;
  const { name } = req.body;
  try {
    console.log('catgeoryId = ', categoryId, ' and subcategoryId = ', subcategoryId);
    const category = await Category.findById(categoryId);
    if (!category) {
      res.status(404).send('Category not found');
      return;
    }
    const subcategory = category.subcategories.id(subcategoryId);
    if (!subcategory) {
      res.status(404).send('Subcategory not found');
      return;
    }
    if (name) {
      subcategory.name = name;
    }
    if (req.file) {
      const picture = await upload(req.file.path);
      subcategory.picture = picture;
    }
    await category.save();
    return res.status(200).json('Subcategory updated successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
}
)

router.delete("/deletesub/:categoryId/:subcategoryId", async (req, res) => {
  const { categoryId, subcategoryId } = req.params;
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    const subcategory = category.subcategories.find(sub => sub.id === subcategoryId);
    if (!subcategory) {
      return res.status(404).json({ success: false, message: 'Subcategory not found in category' });
    }
    const result = await Category.findByIdAndUpdate(categoryId, {
      $pull: { subcategories: { _id: subcategoryId } },
      $inc: { __v: -1 }
    });
    if (result) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(404).json({ success: false, message: 'Failed to delete subcategory' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
)

router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    const result = await category.deleteOne({ _id: id });
    if (result) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(404).json({ success: false, message: 'error' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
)

module.exports = router;