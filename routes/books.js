const express = require("express");
const router = express.Router();
const Book = require("../models/books");
const Author = require("../models/authors");

const imageMimeTypes = ["image/jpeg", "image/jpeg", "image/png", "image/gif"];

// All Books Route
router.get("/", async (req, res) => {
  let query = Book.find();
  if (req.query.title) {
    query = query.regex("title", new RegExp(req.query.title, "i"));
  }
  if (req.query.publishedBefore) {
    query = query.lte("publishDate", req.query.publishedBefore);
  }
  if (req.query.publishedAfter) {
    query = query.gte("publishDate", req.query.publishedAfter);
  }
  try {
    const books = await query.exec();
    res.render("books/index", {
      books: books,
      searchOptions: req.query,
    });
  } catch (error) {
    res.redirect("/");
  }
});

// New Book Route
router.get("/new", async (req, res) => {
  renderNewPage(res, new Book());
});

// Create Book Route
router.post("/", async (req, res) => {
  const fileName = req.file?.filename;
  const book = new Book({
    title: req.body.title,
    author: req.body.author,
    publishDate: new Date(req.body.publishDate),
    pageCount: req.body.pageCount,
    description: req.body.description,
  });
  saveCover(book, req.body.cover);

  try {
    const newBook = await book.save();
    res.redirect(`books/${newBook.id}`);
  } catch (error) {
    renderNewPage(res, book, true);
  }
});

// View Book Route
router.get("/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate({
        path: "author",
        select: "name",
      })
      .exec();
    res.render("books/show", {
      book: book,
    });
  } catch (error) {
    res.redirect("/");
  }
});

// New Book Route
router.get("/:id/edit", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    renderEditPage(res, book);
  } catch (error) {}
});

// Update Book Route
router.put("/:id", async (req, res) => {
  let book;
  try {
    const book = await Book.findById(req.params.id);
    book.title = req.body.title;
    book.author = req.body.author;
    book.publishDate = new Date(req.body.publishDate);
    book.pageCount = req.body.pageCount;
    book.description = req.body.description;
    if (req.body.cover) {
      saveCover(book, req.body.cover);
    }
    await book.save();
    res.redirect(`/books/${book.id}`);
  } catch (error) {
    if (book) {
      renderEditPage(res, book, true);
    } else {
      redirect("/");
    }
  }
});

router.delete("/:id", async (req, res) => {
  let book;
  try {
    book = await Book.findById(req.params.id);
    await book.remove();
    res.redirect("/books");
  } catch (error) {
    if (book) {
      res.render("books/show", {
        book: book,
        errorMessage: "Unable to remove book",
      });
    } else {
      res.redirect("/");
    }
  }
});

async function renderNewPage(res, book, hasError = false) {
  renderFormPage(res, book, "new", hasError);
}

function saveCover(book, coverEncoded) {
  if (coverEncoded) {
    const cover = JSON.parse(coverEncoded);
    if (cover && imageMimeTypes.includes(cover.type)) {
      book.coverImage = new Buffer.from(cover.data, "base64");
      book.coverImageType = cover.type;
    }
  }
}

async function renderEditPage(res, book, hasError = false) {
  renderFormPage(res, book, "edit", hasError);
}

async function renderFormPage(res, book, form, hasError = false) {
  try {
    const authors = await Author.find({});
    const params = {
      authors: authors,
      book: book,
    };
    if (hasError)
      params.errorMessage =
        form === "edit" ? "Error Updating Book" : "Error Creating Book";
    res.render(`books/${form}`, params);
  } catch (error) {
    res.redirect("/books");
  }
}

module.exports = router;
