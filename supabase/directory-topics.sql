-- Repeatable: register new directory topics for comments and recipes.
begin;
insert into public.community_products(id) values
 ('natural-skin-care'),
 ('natural-sunburn-care'),
 ('natural-bug-bite-care'),
 ('natural-cough-comfort'),
 ('natural-clogged-drains'),
 ('natural-mouse-deterrents'),
 ('natural-spider-deterrents')
on conflict (id) do nothing;
commit;
