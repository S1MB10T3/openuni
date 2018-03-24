# Generated by Django 2.0.3 on 2018-03-24 18:40

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Note',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=100)),
                ('description', models.TextField()),
                ('service', models.CharField(max_length=100)),
                ('link', models.CharField(max_length=100)),
                ('noteType', models.CharField(choices=[('video', 'video'), ('pdf', 'pdf'), ('csv', 'csv'), ('audio', 'audio'), ('compressed', 'compressed'), ('text', 'text')], default='text', max_length=15)),
            ],
        ),
        migrations.CreateModel(
            name='Profile',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ],
        ),
        migrations.CreateModel(
            name='Stream',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(default='New Stream', max_length=100)),
                ('description', models.TextField()),
                ('channel', models.CharField(blank=True, max_length=100)),
                ('service', models.CharField(blank=True, max_length=100)),
                ('live', models.BooleanField(default=False)),
                ('viewers', models.PositiveIntegerField(default=0)),
            ],
        ),
        migrations.AddField(
            model_name='profile',
            name='stream',
            field=models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile', to='stream.Stream'),
        ),
        migrations.AddField(
            model_name='profile',
            name='user',
            field=models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='note',
            name='uploader',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='uploads', to='stream.Profile'),
        ),
    ]